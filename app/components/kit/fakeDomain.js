// The invented look-alike site for the Official Sources UV check. Pure and framework-free;
// unit-tested in scripts/passport/__tests__/uv.test.mjs and scripts/kit/__tests__/kit-boundary.test.mjs.

/**
 * The invented look-alike site for a country: `<country-name-lowercased-hyphenated>-visa-fastpass.example`.
 * Accents are stripped (NFKD), anything that is not a-z / 0-9 becomes '-', runs of dashes collapse
 * and the ends are trimmed. Always the reserved `.example` TLD, so it can never be a real (scam)
 * domain; render it as plain text, never as a link.
 */
export function fakeDomain(name) {
  const slug = String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'country'}-visa-fastpass.example`;
}
