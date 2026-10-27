// Shared helpers for the scrapers: a polite client for the wiki.gg MediaWiki API.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const API = 'https://palworld.wiki.gg/api.php';
export const UA =
  'paldex-scraper/1.0 (personal project; https://github.com/JaedenW/paldex-react)';
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const json = await res.json();
      if (!json.error) return json;
    }
    await sleep(1000 * (attempt + 1));
  }
  throw new Error(`API request failed: ${url}`);
}

/** Page wikitext by title, fetched 50 at a time */
export async function wikitext(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const json = await api({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: titles.slice(i, i + 50).join('|'),
    });
    for (const page of Object.values(json.query.pages)) {
      const text = page.revisions?.[0]?.slots?.main?.['*'];
      if (text) out.set(page.title, text);
    }
    await sleep(300);
  }
  return out;
}
