// When Groq fails (or answers with junk), the four AI routes answer with the calm friendly
// sentence, never the raw error text, and log the real error on the server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const { friendlyError } = await import(new URL('../../../app/lib/friendlyError.js', import.meta.url));

// A stand-in for api.groq.com: 'reject' answers 400 with a secret-looking message (the SDK puts the
// body in its error message), 'junk' answers 200 with a completion whose content is not JSON.
let mode = 'reject';
const SECRET = 'gsk_live_SECRET_0123456789';
const server = http.createServer((req, res) => {
  req.resume();
  req.on('end', () => {
    res.setHeader('content-type', 'application/json');
    if (mode === 'reject') {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: { message: `Invalid API key ${SECRET}`, type: 'invalid_request_error' } }));
    } else {
      res.end(JSON.stringify({
        id: 'x', object: 'chat.completion', created: 0, model: 'm',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'Sorry, no JSON here' } }],
      }));
    }
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
process.env.GROQ_API_KEY = 'test-key';
process.env.GROQ_BASE_URL = `http://127.0.0.1:${server.address().port}`;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const route = (name) => import(new URL(`../../../app/api/${name}/route.js`, import.meta.url));
const visaIntel = await route('visa-intel');
const visaProbability = await route('visa-probability');
const relocation = await route('relocation');
const countryMatch = await route('country-match');

// Each route with a valid body that gets past its own validation. Cache keys are unique per
// mode so a successful call can never satisfy a later one from the in-memory cache.
const CASES = [
  ['visa', visaIntel, (m) => ({ nationality: `pk-${m}`, targetCountry: 'ca', purpose: 'work' })],
  ['probability', visaProbability, (m) => ({ nationality: `pk-${m}`, destination: 'ca', purpose: 'work' })],
  ['relocation', relocation, (m) => ({ destination: `Lisbon-${m}`, origin: 'pk' })],
  ['match', countryMatch, (m) => ({ profile: { nationality: `pk-${m}`, skills: ['nursing'] } })],
];

const realConsoleError = console.error;
let logged;
before(() => { console.error = (...args) => { logged.push(args); }; });
after(() => {
  console.error = realConsoleError;
  server.closeAllConnections();
  server.close();
});

for (const failure of ['reject', 'junk']) {
  for (const [kind, mod, body] of CASES) {
    test(`${kind} route: ${failure === 'reject' ? 'a Groq error' : 'a non-JSON answer'} gives the friendly sentence and logs the real error`, async () => {
      mode = failure;
      logged = [];
      const res = await mod.POST(new Request('http://localhost/api/x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body(failure)),
      }));
      assert.equal(res.status, 500);
      const text = await res.text();
      assert.deepEqual(JSON.parse(text), { error: friendlyError(kind) });
      assert.ok(!text.includes(SECRET) && !/unexpected token|400|invalid/i.test(text), `leaked: ${text}`);
      assert.equal(logged.length, 1, 'the real error is logged once');
      assert.ok(logged[0].some((a) => a instanceof Error), 'the logged arguments include the Error');
    });
  }
}
