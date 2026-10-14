// /relocate's stylesheets (relocate.css, kit/ticket.css) and markup contract: no CSS trig, only
// transform / opacity ever animate, every text colour readable (>= 4.5:1) on each surface it can
// sit on, 16px body text on phones, stamps and flying stubs clipped (no sideways scroll), and the
// page's accessibility / trust rules (a real form, chips that report their state, the guide
// announced and focused, a real tablist, decorative codes and stamp hidden, tel: and safe links,
// the not-legal-advice notice, no emoji).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const { contrastRatio, PAGE_PAPER, STAMP_INKS } = await import(new URL('app/components/kit/stampInks.js', ROOT));

const GROUND = '#efe7d6';
const PAGE_INK = '#1f2a24';
const TICKET = PAGE_PAPER; // the pass's card is the passport paper, --page (spec §4.1, mockup .bp)
const STUB = '#f6efe0';
const TAB = '#f6eedb';

const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJs = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const PAGE_CSS = stripCss(read('app/relocate/relocate.css'));
const TICKET_CSS = stripCss(read('app/components/kit/ticket.css'));

// The css without its @media blocks whose query matches `drop` (e.g. /min-width/: the phone rules).
function withoutMedia(css, drop) {
  let out = '';
  let i = 0;
  for (let at = css.indexOf('@media', i); at !== -1; at = css.indexOf('@media', i)) {
    const open = css.indexOf('{', at);
    let depth = 0;
    let end = open;
    for (; end < css.length; end++) {
      if (css[end] === '{') depth++;
      else if (css[end] === '}' && --depth === 0) break;
    }
    out += css.slice(i, at);
    if (!drop.test(css.slice(at, open))) out += css.slice(open + 1, end);
    i = end + 1;
  }
  return out + css.slice(i);
}
// Innermost rules as { selectors, body } (rules inside @media come out with their own selectors).
const rules = (css) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selectors: m[1].split(';').pop().split(',').map((s) => s.trim()), body: m[2] }));
const decl = (body, prop) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim() ?? null;
const fontSize = (body) => decl(body, 'font-size') ?? /(?:^|\s)(\d+(?:\.\d+)?px)\//.exec(decl(body, 'font') ?? '')?.[1] ?? null;

test('relocate.css and ticket.css: no CSS trig; only transform / opacity transition or animate', () => {
  for (const [name, css] of [['relocate.css', PAGE_CSS], ['ticket.css', TICKET_CSS]]) {
    assert.ok(css.length > 1500, `${name} holds the styles`);
    assert.doesNotMatch(css, /atan2|\btan\(|\bsin\(|\bcos\(/, name);
    for (const { selectors, body } of rules(css)) {
      for (const m of body.matchAll(/(?:^|;)\s*transition(?:-property)?\s*:\s*([^;]+)/g)) {
        for (const part of m[1].split(/,(?![^(]*\))/)) {
          assert.ok(['transform', 'opacity', 'none'].includes(part.trim().split(/\s+/)[0]), `${name} ${selectors}: transition ${part}`);
        }
      }
    }
  }
  assert.doesNotMatch(PAGE_CSS, /@keyframes|(?:^|;|\{)\s*animation(?:-name)?\s*:/, 'relocate.css starts no animation of its own');
  // The ticket's only keyframes are the stub's tear: transform + opacity.
  const frames = [...TICKET_CSS.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)];
  assert.deepEqual(frames.map((f) => f[1]).sort(), ['tk-tear', 'tk-tear-up']);
  for (const [, name, body] of frames) {
    for (const [, props] of body.matchAll(/\{([^{}]*)\}/g)) {
      for (const d of props.split(';').map((s) => s.trim()).filter(Boolean)) {
        assert.ok(/^(transform|opacity)\s*:/.test(d), `${name}: ${d}`);
      }
    }
  }
});

test('the tear lasts 700ms in CSS and in Ticket.js, and reduced motion never flies', () => {
  assert.match(TICKET_CSS, /\.tk-stub--flying\s*\{[^}]*animation:\s*tk-tear-up 700ms/);
  assert.match(read('app/components/kit/Ticket.js'), /const TEAR_MS = 700;/);
  assert.match(TICKET_CSS, /@media \(prefers-reduced-motion: reduce\)\s*\{[^{}]*\.tk-stub--flying\s*\{\s*animation:\s*none;/);
});

test('every text colour reaches 4.5:1 on each surface it can sit on', () => {
  const check = (name, css, surfaces, skip = []) => {
    const colours = new Set();
    for (const { selectors, body } of rules(css)) {
      if (selectors.some((s) => skip.includes(s))) continue;
      const value = decl(body, 'color');
      if (!value || value === 'transparent' || value === 'currentColor') continue;
      colours.add(value === 'var(--page-ink)' ? PAGE_INK : value);
    }
    assert.ok(colours.size >= 4, `${name}: found ${colours.size} text colours`);
    for (const fg of colours) {
      assert.match(fg, /^#[0-9a-f]{6}$/i, `${name}: a #rrggbb text colour, got ${fg}`);
      for (const bg of surfaces) {
        const ratio = contrastRatio(fg, bg);
        assert.ok(ratio >= 4.5, `${name}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
      }
    }
  };
  // The selected tab is paper on page ink (checked below); everything else sits on paper or ground.
  check('relocate.css', PAGE_CSS, [PAGE_PAPER, GROUND, TAB], [".rl-tab[aria-selected='true']"]);
  check('ticket.css', TICKET_CSS, [TICKET, STUB, PAGE_PAPER, GROUND]);
  assert.ok(contrastRatio(PAGE_PAPER, PAGE_INK) >= 4.5);
  // Inks the page uses inline or by data attribute are the stamp inks.
  for (const ink of Object.values(STAMP_INKS)) {
    for (const bg of [PAGE_PAPER, GROUND, TICKET]) assert.ok(contrastRatio(ink, bg) >= 4.5, `${ink} on ${bg}`);
  }
});

test('the boarding pass is the passport paper (#fbf8f2, spec §4.1 and the mockup .bp), never white', () => {
  const backgrounds = rules(TICKET_CSS).filter((r) => r.selectors.includes('.tk-main')).map((r) => decl(r.body, 'background')).filter(Boolean);
  assert.deepEqual(backgrounds, ['var(--page)'], 'the card is the --page token');
  assert.match(read('app/globals.css'), /--page:\s*#fbf8f2;/);
  assert.equal(PAGE_PAPER, '#fbf8f2');
  assert.doesNotMatch(TICKET_CSS, /#fff(?:fff)?\b|\bwhite\b(?!-space)/i, 'no white anywhere on the pass');
  const stub = rules(TICKET_CSS).filter((r) => r.selectors.includes('.tk-stub')).map((r) => decl(r.body, 'background')).filter(Boolean);
  assert.deepEqual(stub, [STUB], 'the stub stays the darker paper of the mockup');
});

test('body text is at least 16px on phones', () => {
  const phone = (css) => rules(withoutMedia(css, /min-width/));
  const sizes = (css, selector) => phone(css).filter((r) => r.selectors.includes(selector)).map((r) => fontSize(r.body)).filter(Boolean);
  const page = ['.rl-text', '.rl-note', '.rl-level', '.rl-lead', '.rl-list > li', '.rl-tags > li', '.rl-error', '.rl-closing',
    '.rl-cost-label', '.rl-cost-amount', '.rl-cost-note', '.rl-facts dd', '.rl-go', '.rl-card-h', '.rl-pending-city'];
  const ticket = ['.tk-city', '.tk-stub-list > li', '.tk-tear', '.tk-saved', '.tk-note', '.tk-tiers dd'];
  for (const [css, list] of [[PAGE_CSS, page], [TICKET_CSS, ticket]]) {
    for (const selector of list) {
      const found = sizes(css, selector);
      assert.ok(found.length > 0, `${selector} sets a font size`);
      for (const size of found) assert.ok(parseFloat(size) >= 16, `${selector}: ${size}`);
    }
  }
});

test('stamps and the flying stub are clipped, so the page never scrolls sideways', () => {
  const has = (css, selector, re) => rules(css).some((r) => r.selectors.includes(selector) && re.test(r.body));
  assert.ok(has(TICKET_CSS, '.tk-main', /overflow\s*:\s*clip/), '.tk-main clips the ADMITTED stamp in the air');
  assert.ok(has(PAGE_CSS, '.rl-page .kit-check', /overflow\s*:\s*clip/), 'the checklist clips its PACKED stamp');
  assert.ok(has(PAGE_CSS, '.rl-results', /overflow-x\s*:\s*clip/), 'the results clip the flying stub sideways');
  assert.ok(has(PAGE_CSS, '.rl-tabs', /overflow-x\s*:\s*auto/), 'the tab strip scrolls on its own');
});

test('page markup: real form, chips, the guide announced and focused, disclaimer, no emoji', () => {
  const page = read('app/relocate/page.js');
  assert.match(page, /<PassportCard as="form" className="rl-form" onSubmit=\{handleSubmit\}/);
  assert.match(page, /type="submit"/);
  assert.match(page, /<Chip key=\{name\} pressed=\{destination === name\} disabled=\{loading\}/, 'chips report their state and rest while a search runs');
  // A resting chip is aria-disabled (kit Chip), so it keeps keyboard focus; a tap on it starts nothing.
  assert.match(page, /const pickCity = \(name\) => \{\s*if \(loading\) return;/, 'a tap while a search runs is ignored');
  assert.match(page, /<ResultArrival key=\{guide\.id\} id=\{GUIDE_HEADING_ID\}/);
  assert.match(page, /headingId=\{GUIDE_HEADING_ID\}/);
  assert.match(page, /<DisclaimerBlock tone="paper" \/>/, 'the not-legal-advice notice on the result');
  assert.match(page, /fetchGuide\(latest,/, 'answers go through the stale-response guard');
  assert.match(page, /if \(!result\) return;/, 'a stale answer is dropped');
  assert.match(page, /onTear=\{\(\) => saveWeekPlan\(deviceStorage\(\), guide\.query\.destination, pass\.stubItems\)\}/, 'the stub saves only when torn');
  for (const label of ['htmlFor="relocate-destination"', 'htmlFor="relocate-origin"', 'htmlFor="relocate-field"']) assert.ok(page.includes(label), label);
  for (const file of ['app/relocate/page.js', 'app/relocate/GuideChapters.js', 'app/components/kit/Ticket.js', 'app/lib/relocate.js']) {
    assert.doesNotMatch(read(file), /\p{Extended_Pictographic}/u, `${file} uses an emoji icon`);
  }
});

test('the boarding pass: heading for the arrival, decorative codes and stamp, an explicit save', () => {
  const ticket = read('app/components/kit/Ticket.js');
  assert.match(ticket, /<h2 id=\{headingId\} className="tk-head">/);
  assert.match(ticket, /<span className="tk-codes" aria-hidden="true">/);
  assert.match(ticket, /<span className="tk-stamp" aria-hidden="true">\s*<Stamp shape="rect" color=\{STAMP_INKS\.blue\}/);
  assert.match(ticket, /<button type="button" className="tk-tear" onClick=\{tearOff\}>/);
  assert.match(ticket, /'Save my first-week plan'/, 'the reduced-motion button');
  assert.match(ticket, /aria-live="polite"/);
  assert.match(ticket, /TICKET_SAVED = 'Saved on this device'/);
  // Nothing saves without a tap: onTear (the page's save) is called exactly once, inside `finish`,
  // and finish runs only from tearOff, the button's click handler (never an effect or a timer).
  const code = stripJs(ticket);
  assert.deepEqual(code.match(/\bonTear\b/g), ['onTear', 'onTear'], 'the prop and its one call, nothing else');
  assert.deepEqual(code.match(/onTear\?\.\(\)/g), ['onTear?.()'], 'called once');
  assert.match(/const finish = \(\) => ([^;]*);/.exec(code)?.[1] ?? '', /onTear\?\.\(\)/, 'the call is inside finish');
  assert.deepEqual(code.match(/\bfinish\b/g), ['finish', 'finish'], 'finish is defined once and run once');
  const tearOff = /const tearOff = \(event\) => \{([\s\S]*?)\n {2}\};/.exec(code)?.[1] ?? '';
  assert.match(tearOff, /const outcome = finish\(\);/, 'run by the tap handler');
  assert.deepEqual(code.match(/\btearOff\b/g), ['tearOff', 'tearOff'], 'the handler is the button\'s click and nothing else');
  assert.match(code, /<button type="button" className="tk-tear" onClick=\{tearOff\}>/);
});

test('the boarding pass: a stub that could not be saved stays on the pass, still, beside the note', () => {
  const code = stripJs(read('app/components/kit/Ticket.js'));
  const tearOff = /const tearOff = \(event\) => \{([\s\S]*?)\n {2}\};/.exec(code)?.[1] ?? '';
  // Not saved (storage blocked): no flight at all; only a saved stub tears off.
  assert.match(tearOff, /if \(reducedMotion \|\| outcome === 'failed'\) \{\s*setTear\(outcome\);\s*return;\s*\}\s*setTear\('flying'\);/);
  assert.match(tearOff, /window\.setTimeout\(\(\) => setTear\('saved'\), TEAR_MS\)/);
  // The stub and its items render whenever it is not saved (failed included); only the button goes.
  assert.match(code, /if \(stubItems\.length > 0 && saved\) \{[\s\S]*?\} else if \(stubItems\.length > 0\) \{/);
  assert.match(code, /\{failed \? null : \(\s*<button type="button" className="tk-tear"/);
  assert.match(code, /data-ok=\{failed \? 'false' : undefined\} aria-live="polite"/);
  assert.match(code, /const note = tear === 'saved' \? NOTE_SAVED : failed \? NOTE_FAILED : '';/);
});

test('the chapters: a real tablist with arrow keys; tel: and safe external links', () => {
  const src = read('app/relocate/GuideChapters.js');
  assert.match(src, /role="tablist"/);
  assert.match(src, /role="tab"/);
  assert.match(src, /aria-selected=\{c\.id === current\}/);
  assert.match(src, /aria-controls=/);
  assert.match(src, /role="tabpanel"/);
  assert.match(src, /tabIndex=\{c\.id === current \? 0 : -1\}/, 'roving tabindex');
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) assert.ok(src.includes(key), key);
  assert.match(src, /const href = telHref\(number\);/);
  assert.match(src, /const href = safeUrl\(c\.url\);/);
  assert.match(src, /target="_blank" rel="noopener noreferrer"/);
  // The fields the old page dropped are shown.
  for (const shown of ['bank.notes', 'language.detail', 'c.url']) assert.ok(src.includes(shown), shown);
});

test('the chapters render only the opened panels: one on arrival, while the ADMITTED stamp lands', () => {
  const src = read('app/relocate/GuideChapters.js');
  // Every chapter keeps its tabpanel (so each tab's aria-controls resolves) ...
  const shells = /\{chapters\.map\(\(c\) => \{[\s\S]*?role="tabpanel"[\s\S]*?id=\{`\$\{base\}-panel-\$\{c\.id\}`\}[\s\S]*?\}\)\}/.exec(src)?.[0] ?? '';
  assert.ok(shells, 'a tabpanel for every chapter, with the id its tab controls');
  // ... but a panel's content is rendered only once its tab is opened (openChapter).
  assert.match(src, /useState\(\(\) => openChapter\(\[\], chapters\[0\]\?\.id\)\)/, 'on arrival only the first chapter');
  assert.match(src, /setOpened\(\(list\) => openChapter\(list, id\)\)/, 'choosing a tab renders its panel');
  assert.match(shells, /shown\.includes\(c\.id\) \? <Panel /, 'the other panels stay empty');
  assert.equal(src.match(/<Panel /g)?.length, 1, 'no other place renders a panel');
});
