// Host / domain rules for the official-sources verifier. Pure functions.

// Lower-cased hostname without a leading "www.", or null if not a URL.
export function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

// True if host is `domain` or a subdomain of it (label boundary, so
// "notcanada.ca" does not match "canada.ca" and "canada.ca.evil.com" does not).
export function hostMatches(host, domain) {
  if (!host || !domain) return false;
  const d = domain.toLowerCase().replace(/^\./, '');
  return host === d || host.endsWith('.' + d);
}

export function isAllowedHost(host, govDomains) {
  return Array.isArray(govDomains) && govDomains.some((d) => hostMatches(host, d));
}
