// Official Sources figures for the homepage, computed on the server from OFFICIAL_SOURCES
// (app/data/officialSources.js, ~200KB: never import that into client code). Pure; the sources
// object is passed in (unit-tested in stage-helpers.test.mjs).

const linksOf = (entry) => Object.values(entry?.links || {});

/** Every link with status 'verified', across all countries (418 when this was written). */
export function countVerifiedLinks(sources) {
  let n = 0;
  for (const entry of Object.values(sources || {})) {
    for (const link of linksOf(entry)) if (link?.status === 'verified') n++;
  }
  return n;
}

function bareDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return String(url || '');
  }
}

/** { [code]: { name, url, domain } } for each country whose immigration authority link is verified. */
export function verifiedAuthorities(sources) {
  const out = {};
  for (const [code, entry] of Object.entries(sources || {})) {
    const link = entry?.links?.authority;
    if (link?.status === 'verified' && link.url) {
      out[code] = { name: link.name || bareDomain(link.url), url: link.url, domain: bareDomain(link.url) };
    }
  }
  return out;
}
