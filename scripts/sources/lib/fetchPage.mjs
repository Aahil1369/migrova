// Fetch a page for verification: final URL after redirects, status, readable
// text and outgoing links. Falls back to headless Chrome when a site blocks
// scripted requests, has a TLS chain Node rejects, or renders only with JS.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BLOCKED = /just a moment|enable javascript|access denied|attention required|captcha|request rejected|are you a robot/i;
const RETRY_STATUSES = new Set([401, 403, 406, 429, 500, 502, 503, 504]);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

export function extract(html, baseUrl) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const metas = [...html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:title|og:description)["'][^>]*content=["']([^"']*)["']/gi)].map((m) => m[1]);
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const text = decode([title, ...metas, body].join(' ')).replace(/\s+/g, ' ').trim().slice(0, 200_000);
  const hrefs = new Set();
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    try { hrefs.add(new URL(decode(m[1]), baseUrl).href); } catch { /* skip */ }
  }
  return { text, hrefs: [...hrefs] };
}

// At most 3 Chrome instances at once.
let chromeSlots = 3;
const waiters = [];
async function withChromeSlot(fn) {
  if (chromeSlots === 0) await new Promise((r) => waiters.push(r));
  chromeSlots--;
  try { return await fn(); } finally { chromeSlots++; waiters.shift()?.(); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Load `url` in headless Chrome over the DevTools protocol and report the
// real post-redirect URL and document status (plain --dump-dom hides both,
// which would let an off-domain redirect pass as the original host).
export async function loadInChrome(url) {
  const dir = mkdtempSync(join(tmpdir(), 'srcchk-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${dir}`, '--remote-debugging-port=0', `--user-agent=${UA}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  const killer = setTimeout(() => proc.kill(), 55_000); // never leave Chrome running
  let ws;
  try {
    let portFile = null;
    for (let i = 0; i < 100 && !portFile; i++) {
      try { portFile = readFileSync(join(dir, 'DevToolsActivePort'), 'utf8').split('\n'); } catch { await sleep(100); }
    }
    if (!portFile) return null;
    ws = new WebSocket(`ws://127.0.0.1:${portFile[0].trim()}${portFile[1].trim()}`);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let nextId = 1;
    const pending = new Map();
    const listeners = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
      else listeners.forEach((fn) => fn(msg));
    };
    const send = (method, params = {}, sessionId) => new Promise((res) => {
      const id = nextId++;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
    });

    const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
    const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
    let status = null;
    let loaded = false;
    listeners.push((m) => {
      if (m.sessionId !== sessionId) return;
      if (m.method === 'Network.responseReceived' && m.params.type === 'Document') status = m.params.response.status;
      if (m.method === 'Page.loadEventFired') loaded = true;
    });
    await send('Network.enable', {}, sessionId);
    await send('Page.enable', {}, sessionId);
    await send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 300 && !loaded; i++) await sleep(100);
    await sleep(2500); // let client-side rendering settle
    const r = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({ href: location.href, html: document.documentElement.outerHTML })',
      returnByValue: true,
    }, sessionId);
    const { href, html } = JSON.parse(r.result?.result?.value || '{}');
    return href ? { finalUrl: href, status: status ?? 200, html } : null;
  } catch (e) {
    if (process.env.DEBUG_SOURCES) console.error('chrome:', url, e?.message || e);
    return null;
  } finally {
    clearTimeout(killer);
    try { ws?.close(); } catch { /* ignore */ }
    proc.kill();
    await sleep(300);
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* Chrome may still hold files */ }
  }
}

function withTimeout(promise, ms) {
  return Promise.race([promise, sleep(ms).then(() => null)]);
}

async function plainFetch(url, timeoutMs) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language': 'en,*;q=0.5' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const type = res.headers.get('content-type') || '';
  const html = !type || /html|xml|text/i.test(type) ? await res.text() : (await res.body?.cancel(), '');
  return { finalUrl: res.url, status: res.status, html };
}

export async function fetchPage(url, { timeoutMs = 20_000 } = {}) {
  let first = null;
  let fetchError = null;
  try {
    first = await plainFetch(url, timeoutMs);
  } catch (e) {
    fetchError = e.cause?.code || e.name || String(e.message || e);
  }

  if (first) {
    const { text, hrefs } = extract(first.html, first.finalUrl);
    const needsBrowser = RETRY_STATUSES.has(first.status) || (first.status < 300 && (text.length < 200 || BLOCKED.test(text.slice(0, 2000))));
    if (!needsBrowser) return { finalUrl: first.finalUrl, status: first.status, text, hrefs, via: 'fetch' };
  }

  // Browser fallback: real Chrome, real final URL and status.
  const loaded = await withChromeSlot(() => withTimeout(loadInChrome(url), 60_000));
  if (loaded) {
    const { text, hrefs } = extract(loaded.html, loaded.finalUrl);
    if (loaded.status >= 300) return { error: `status:${loaded.status}` };
    if (text.length >= 40 && !BLOCKED.test(text.slice(0, 2000))) {
      return { finalUrl: loaded.finalUrl, status: loaded.status, text, hrefs, via: 'chrome' };
    }
  }
  if (first) return { error: first.status >= 300 ? `status:${first.status}` : 'blocked' };
  return { error: fetchError || 'unreachable' };
}
