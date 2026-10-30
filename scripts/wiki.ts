// Shared helpers for the scrapers: a polite client for the wiki.gg MediaWiki API.
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const API = 'https://palworld.wiki.gg/api.php';
export const UA =
  'paldex-scraper/1.0 (personal project; https://github.com/JaedenW/paldex-react)';
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** One Cargo row: every field comes back as a string, empty when unset */
export type Row = Record<string, string>;

export interface ApiPage {
  title: string;
  revisions?: { slots?: { main?: { '*'?: string } } }[];
  imageinfo?: { url: string; width?: number; height?: number }[];
}

/** The shape of a `query` response (page text, image info) */
export interface QueryResponse {
  query: { pages: Record<string, ApiPage> };
}

/** The shape of a `cargoquery` response */
export interface CargoResponse {
  cargoquery: { title: Row }[];
}

export async function api<T = QueryResponse>(
  params: Record<string, string>
): Promise<T> {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const json = (await res.json()) as T & { error?: unknown };
      if (!json.error) return json;
    }
    await sleep(1000 * (attempt + 1));
  }
  throw new Error(`API request failed: ${url}`);
}

/** Page wikitext by title, fetched 50 at a time */
export async function wikitext(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
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
export async function cargo(
  table: string,
  fields: string[],
  where?: string
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 500) {
    const json = await api<CargoResponse>({
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

export { slugify as slug } from '../src/Utils/text.ts';

/** HTML entities the wiki leaves in names and text */
export const decodeEntities = (s = ''): string =>
  s.replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/** Wikitext to plain text: links, icons and bold resolved, templates, comments and tags dropped */
export function stripMarkup(s = ''): string {
  return s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(
      /\{\{\s*(?:i|icon)\s*\|([^}]*)\}\}/gi,
      (_, args: string) => args.split('|').pop() ?? ''
    )
    .replace(/\[\[(?:File|Category):[^\]]*\]\]/gi, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/'''?/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/**
 * Names the wiki flags as unused: things in the game files that players can't
 * get, such as leftover items. They are left out of the app's data.
 */
export async function unusedNames(): Promise<Set<string>> {
  const rows = await cargo(
    'ContentFlag',
    ['itemName', 'flag'],
    'flag="Unused"'
  );
  return new Set(rows.map((r) => decodeEntities(r.itemName)));
}

/** The newest game version the wiki has a page for, and its release date */
export async function latestVersion(): Promise<{
  version?: string;
  date?: string;
}> {
  const rows = await cargo('GameVersions', ['title', 'release_date']);
  rows.sort((a, b) =>
    (b['release date'] ?? '').localeCompare(a['release date'] ?? '')
  );
  return { version: rows[0]?.title, date: rows[0]?.['release date'] };
}

/** A JSON file in the project (such as src/data/pals.json), read as `T` */
export async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8')) as T;
}
