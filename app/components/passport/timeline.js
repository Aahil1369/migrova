// Journey Book scroll timeline: beats -> contiguous progress ranges, and the
// mapping between pages and scroll progress. Pure and framework-free.

export const PAGES = [
  'cover', 'notice', 'data', 'visas1', 'visas2', 'entries', 'sources', 'travellers', 'observations',
];

// Homepage hash anchors -> the page that should be visible for them.
export const ANCHORS = {
  tools: 'visas1',
  'how-it-works': 'entries',
  sources: 'sources',
  stories: 'travellers',
};

// [beat id, weight in viewport heights]; weights sum to 7.95.
export const BEATS = [
  ['arrival', 0.4], ['ajar', 0.4], ['open', 0.5], ['spread1', 0.8], ['flip1', 0.35],
  ['spread2', 0.9], ['flip2', 0.35], ['spread3', 0.7], ['uv', 1.0], ['flip3', 0.35],
  ['spread4', 0.8], ['closing', 0.8], ['finale', 0.6],
];

// Which spread beat shows each page.
export const SPREAD_OF = {
  notice: 'spread1',
  data: 'spread1',
  visas1: 'spread2',
  visas2: 'spread2',
  entries: 'spread3',
  sources: 'spread3',
  travellers: 'spread4',
  observations: 'spread4',
};

const clamp01 = (n) => (n > 0 ? (n < 1 ? n : 1) : 0); // NaN -> 0

/**
 * Turn weighted beats into contiguous [start, end] ranges over progress 0..1.
 * The first range starts at exactly 0 and the last ends at exactly 1.
 */
export function buildTimeline(beats = BEATS) {
  const total = beats.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  const ranges = {};
  const order = [];
  let acc = 0;
  beats.forEach(([id, weight], i) => {
    const start = acc / total;
    acc += weight;
    const end = i === beats.length - 1 ? 1 : acc / total;
    ranges[id] = [start, end];
    order.push(id);
  });
  return { ranges, viewports: total, order };
}

/** Progress inside one beat, 0..1, clamped. */
export function localT(timeline, beatId, p) {
  const range = timeline.ranges[beatId];
  if (!range) return 0;
  const [start, end] = range;
  if (end <= start) return 0;
  return clamp01((p - start) / (end - start));
}

/** The beat containing p. Ranges are half-open [start, end); the last beat includes 1. */
export function beatAt(timeline, p) {
  const { ranges, order } = timeline;
  const q = clamp01(p);
  for (let i = 0; i < order.length - 1; i++) {
    if (q < ranges[order[i]][1]) return order[i];
  }
  return order[order.length - 1];
}

/** Progress at the middle of the page's spread beat. 'cover' (and unknown pages) -> 0. */
export function progressForPage(timeline, pageId) {
  const beatId = SPREAD_OF[pageId];
  const range = beatId && timeline.ranges[beatId];
  if (!range) return 0;
  return (range[0] + range[1]) / 2;
}
