// Count a number up on arrival (verified-link counts). Plain DOM, no React: it rewrites the text
// node React rendered, so the number is already correct in the server HTML.

const COUNT_MS = 1200;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/** Count `el`'s number up from 0 to `target` (rAF, ~1.2s). Returns a cancel function. */
export function countUp(el, target) {
  const node = el.firstChild; // React's text node: update it in place, never replace it
  if (!node || !target) return () => {};
  let frame = 0;
  let start = 0;
  const tick = (now) => {
    if (!start) start = now;
    const t = Math.min(1, (now - start) / COUNT_MS);
    node.nodeValue = String(Math.round(target * easeOutCubic(t)));
    if (t < 1) frame = window.requestAnimationFrame(tick);
  };
  frame = window.requestAnimationFrame(tick);
  return () => {
    window.cancelAnimationFrame(frame);
    node.nodeValue = String(target);
  };
}
