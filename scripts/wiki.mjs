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

/** Every row of a Cargo table (500 per request), optionally filtered */
export async function cargo(table, fields, where) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const json = await api({
      action: 'cargoquery',
      tables: table,
      fields: fields.join(','),
      ...(where && { where }),
      limit: '500',
      offset: String(offset),
    });
    const page = json.cargoquery.map((r) => r.title);
    rows.push(...page);
    if (page.length < 500) return rows;
    await sleep(300);
  }
}

export const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD') // also turns Ⅱ into II
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const decode = (s) => s.replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/**
 * Names the wiki flags as unused: things in the game files that players can't
 * get, such as leftover items. They are left out of the app's data.
 */
export async function unusedNames() {
  const rows = await cargo(
    'ContentFlag',
    ['itemName', 'flag'],
    'flag="Unused"'
  );
  return new Set(rows.map((r) => decode(r.itemName)));
}

/** The newest game version the wiki has a page for, and its release date */
export async function latestVersion() {
  const rows = await cargo('GameVersions', ['title', 'release_date']);
  rows.sort((a, b) =>
    (b['release date'] ?? '').localeCompare(a['release date'] ?? '')
  );
  return { version: rows[0]?.title, date: rows[0]?.['release date'] };
}
