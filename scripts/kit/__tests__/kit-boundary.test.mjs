// The passport kit (app/components/kit): presentational parts shared by the homepage Journey Book
// and the tool pages. Tool pages must never pull in the homepage scroll engine, so the kit may
// not import anything from app/components/passport/ (the homepage may import the kit).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const KIT = new URL('../../../app/components/kit/', import.meta.url);
const kitUrl = (name) => new URL(name, KIT);

// Every .js file under app/components/kit/, as { name, src }.
function kitSources(dir = KIT, prefix = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out.push(...kitSources(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`));
    } else if (entry.name.endsWith('.js')) {
      out.push({ name: `${prefix}${entry.name}`, src: readFileSync(new URL(entry.name, dir), 'utf8') });
    }
  }
  return out;
}

// Module specifiers of `import x from '…'`, `import '…'`, `export … from '…'` and `import('…')`.
function specifiers(src) {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  return [...code.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"\n]+)\1/g)].map((m) => m[2]);
}

test('kit never imports the homepage passport code', () => {
  const files = kitSources();
  assert.ok(files.length >= 12, `expected the moved parts under app/components/kit/, found ${files.length}`);
  for (const { name, src } of files) {
    for (const spec of specifiers(src)) {
      assert.doesNotMatch(spec, /(^|\/)passport(\/|\.|$)/, `${name} imports "${spec}"`);
    }
    assert.doesNotMatch(src, /['"]\.\.\/passport/, `${name} reaches into ../passport`);
  }
});

test('kit CSS has no CSS trig', () => {
  // WebKit resolves tan()/atan2() wrongly (it flipped the homepage book): rules only, not comments.
  const css = readFileSync(kitUrl('kit.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(css.length > 1000, 'kit.css holds the part styles');
  assert.doesNotMatch(css, /atan2|tan\(/);
});

test('moved parts keep their API', async () => {
  const { STAMP_INKS } = await import(kitUrl('stampInks.js'));
  assert.deepEqual(Object.keys(STAMP_INKS), ['green', 'blue', 'terracotta', 'purple', 'gold']);

  const { buildMrz, MRZ_LEN } = await import(kitUrl('mrz.js'));
  const lines = buildMrz({ fromIso3: 'PAK', toIso3: 'CAN', count: 418 });
  assert.equal(lines.length, 2);
  for (const line of lines) assert.equal(line.length, 44, line);
  assert.equal(MRZ_LEN, 44);

  const { fakeDomain } = await import(kitUrl('fakeDomain.js'));
  assert.ok(fakeDomain('Canada').endsWith('.example'));

  const { starField } = await import(kitUrl('starField.js'));
  assert.equal(starField(64, 3).length, 3);
});

test('the homepage re-exports keep its call sites unchanged', async () => {
  const { fakeDomain } = await import(kitUrl('fakeDomain.js'));
  const { starField } = await import(kitUrl('starField.js'));
  const uv = await import('../../../app/components/passport/pages/uv.js');
  const stageStyle = await import('../../../app/components/passport/stageStyle.js');
  assert.equal(uv.fakeDomain, fakeDomain);
  assert.equal(stageStyle.starField, starField);
});

test('countUp: counts the number up from 0 to the target, and cleanup lands on the target', async () => {
  const { countUp } = await import(kitUrl('countUp.js'));
  const queue = [];
  const cancelled = [];
  globalThis.window = {
    requestAnimationFrame: (cb) => queue.push(cb),
    cancelAnimationFrame: (id) => cancelled.push(id),
  };
  try {
    // No text node, or a target of 0: nothing to count, no frame requested, a harmless cleanup.
    for (const [el, target] of [[{ firstChild: null }, 10], [{ firstChild: { nodeValue: '0' } }, 0]]) {
      const idle = countUp(el, target);
      assert.equal(typeof idle, 'function');
      idle();
      assert.equal(queue.length, 0);
    }

    const node = { nodeValue: '418' };
    countUp({ firstChild: node }, 418);
    assert.equal(queue.length, 1, 'one frame requested');
    queue.shift()(1000); // first frame: t = 0
    assert.equal(node.nodeValue, '0');
    queue.shift()(1600); // halfway through the 1.2 s count
    const mid = Number(node.nodeValue);
    assert.ok(mid > 209 && mid < 418, `eased past the halfway mark, got ${mid}`);
    queue.shift()(2300); // done
    assert.equal(node.nodeValue, '418');
    assert.equal(queue.length, 0, 'stops requesting frames once it has arrived');

    // Cleanup mid-count: cancel the pending frame and show the final number.
    const node2 = { nodeValue: '0' };
    const stop = countUp({ firstChild: node2 }, 77);
    queue.shift()(5000);
    stop();
    assert.equal(node2.nodeValue, '77');
    assert.equal(cancelled.length, 1);
  } finally {
    delete globalThis.window;
  }
});
