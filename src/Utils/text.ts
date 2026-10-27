/** "041B" -> "#041B" */
export const palNumber = (n: string) => `#${n}`;

export function compareNumbers(a: string, b: string) {
  return a.localeCompare(b, 'en', { numeric: true });
}

/** Lowercases and strips accents so searches match loosely */
export function normalise(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function formatNumber(n: number | null | undefined, digits = 0) {
  return n == null
    ? '–'
    : n.toLocaleString('en', { maximumFractionDigits: digits });
}

/** URL id for an item or building name; mirrors `slug` in scripts/wiki.mjs */
export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
