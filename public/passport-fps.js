// `?fps=1` debug overlay for the homepage Journey Book. PassportStage injects this file only when
// the param is present (so it costs nothing otherwise) and hands over quality.js's frameStats as
// window.__jbFrameStats. Shows live frame stats over the last ~2s (fps, p50 / p95 frame interval,
// the display's frame interval), the book's layout / motion / adaptive quality tier / fit scale,
// the reported core count and the viewport. Repaints its text twice a second.
(function () {
  if (document.querySelector('[data-fps-overlay]')) return;
  var stats = window.__jbFrameStats;
  if (typeof stats !== 'function') return;

  var box = document.createElement('pre');
  box.setAttribute('data-fps-overlay', '');
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText =
    'position:fixed;left:8px;bottom:max(8px, env(safe-area-inset-bottom));z-index:100;margin:0;' +
    'padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.75);color:#c8ff6e;' +
    'font:11px/1.4 ui-monospace,SFMono-Regular,monospace;white-space:pre;pointer-events:none';
  document.body.appendChild(box);

  var stamps = []; // [time, interval]
  var last = 0;
  function loop(t) {
    if (last) stamps.push([t, t - last]);
    last = t;
    window.requestAnimationFrame(loop);
  }
  window.requestAnimationFrame(loop);

  function paint() {
    var now = performance.now();
    stamps = stamps.filter(function (s) {
      return now - s[0] <= 2000;
    });
    var s = stats(
      stamps.map(function (x) {
        return x[1];
      }),
    );
    var section = document.querySelector('[data-layout]');
    var stage = document.querySelector('.ps-stage');
    var fitEl = document.querySelector('.jb-pad, .jb-book');
    var fit = fitEl ? getComputedStyle(fitEl).scale : '';
    var data = section ? section.dataset : {};
    box.textContent = [
      s.fps.toFixed(0) + ' fps  p50 ' + s.p50.toFixed(1) + '  p95 ' + s.p95.toFixed(1) + ' ms  (vsync ' + s.vsync.toFixed(1) + ')',
      (data.layout || '-') + ' · ' + (data.motion || '-') + ' · q ' + ((stage && stage.dataset.quality) || '-') +
        (fit && fit !== 'none' ? ' · fit ' + Number(fit).toFixed(3) : ''),
      'cores ' + (navigator.hardwareConcurrency || '?') + ' · ' + window.innerWidth + '×' + window.innerHeight + ' @' + window.devicePixelRatio + 'x',
    ].join('\n');
  }
  paint();
  window.setInterval(paint, 500);
})();
