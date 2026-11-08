// Fetches from paldb.cc, the project's main data source. It reads the game's own
// files, so it is the most current source there is. Requests go a few at a time
// and back off if the site asks, and everything is cached in .cache/paldb, so only
// the first run of a scraper costs the site anything. Pass --refresh to fetch
// afresh after a game update.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import { root, sleep } from './wiki.ts';

const BASE = 'https://paldb.cc';
const CDN = 'https://cdn.paldb.cc';
const UA =
  'paldex-react/1.0 (personal fan project; https://github.com/JaedenW/paldex-react)';
const cacheDir = path.join(root, '.cache/paldb');
const refresh = process.argv.includes('--refresh');
const PARALLEL = 4;
const MISSING = '<!-- 404 -->'; // cached too, so a missing page isn't asked for again

export const palSource = BASE;
export const cdn = (file: string) => `${CDN}/${file}`;

// a few at a time; if the site says to slow down, everything waits
let running = 0;
const queue: (() => void)[] = [];
let holdUntil = 0;

async function politeFetch(url: string) {
  if (running >= PARALLEL) await new Promise<void>((go) => queue.push(go));
  running++;
  try {
    for (let attempt = 1; ; attempt++) {
      const wait = holdUntil - Date.now();
      if (wait > 0) await sleep(wait);
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        if (res.ok || res.status === 404) return res;
        if (res.status === 429 || res.status === 503) {
          const seconds = Number(res.headers.get('retry-after')) || 15;
          holdUntil = Date.now() + seconds * 1000;
          console.log(`  paldb.cc asked us to wait ${seconds}s`);
        }
        if (attempt >= 5) throw new Error(`${res.status} from ${url}`);
      } catch (e) {
        if (attempt >= 5) throw e;
      }
      await sleep(attempt * 2000);
    }
  } finally {
    running--;
    queue.shift()?.();
  }
}

const cachePath = (key: string) => {
  const safe = key.replace(/[^\w.-]+/g, '_').slice(0, 120);
  const hash = createHash('sha1').update(key).digest('hex').slice(0, 8);
  return path.join(cacheDir, `${safe}.${hash}`);
};

// with --refresh, each page is still fetched only once per run
const fetchedThisRun = new Set<string>();

/** A file from the site as text, or undefined if it isn't there */
export async function text(url: string): Promise<string | undefined> {
  const file = cachePath(url);
  if (!refresh || fetchedThisRun.has(url)) {
    const cached = await readFile(file, 'utf8').catch(() => undefined);
    if (cached !== undefined) return cached === MISSING ? undefined : cached;
  }
  fetchedThisRun.add(url);
  const res = await politeFetch(`${BASE}/${url}`);
  const body = res.status === 404 ? MISSING : await res.text();
  await mkdir(cacheDir, { recursive: true });
  await writeFile(file, body);
  return res.status === 404 ? undefined : body;
}

/** An English page, ready to query; undefined if it doesn't exist */
export async function page(name: string) {
  const html = await text(`en/${name}`);
  return html === undefined ? undefined : cheerio.load(html);
}

export async function json<T>(url: string): Promise<T | undefined> {
  const body = await text(url);
  return body === undefined ? undefined : (JSON.parse(body) as T);
}

export type Page = NonNullable<Awaited<ReturnType<typeof page>>>;
type Node = Parameters<Page>[0];

export const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();

export const num = (v: string | undefined) => {
  const n = Number((v ?? '').replace(/,/g, ''));
  return v === undefined || v.trim() === '' || Number.isNaN(n) ? null : n;
};

/** The label and value rows of the card a heading belongs to */
export function cardFacts($: Page, heading: Node) {
  const out = new Map<string, string>();
  $(heading)
    .parent()
    .children('div')
    .each((_, row) => {
      const cells = $(row).children('div');
      if (cells.length < 2) return;
      const key = tidy(cells.first().text());
      if (key && !out.has(key)) out.set(key, tidy(cells.last().text()));
    });
  return out;
}

/** Card headings with this exact text */
export const headings = ($: Page, text: string) =>
  $('h5.card-title')
    .toArray()
    .filter((h) => tidy($(h).text()) === text);

/** The game version the site shows in its footer, such as "1.0.5" and its date */
export async function gameVersion() {
  const home = await text('en/');
  // the footer's "Version v1.0.5 2026/09/15"; news cards higher up name older versions
  const m = home?.match(
    /Version\s*(?:<[^>]*>\s*)*v(\d+\.\d+\.\d+)\s*(?:<[^>]*>\s*)*(\d{4})\/(\d{2})\/(\d{2})/
  );
  if (!m) throw new Error('Could not read the game version from paldb.cc');
  return { version: m[1] ?? '', date: `${m[2]}-${m[3]}-${m[4]}` };
}

// ---- positions
// The game's own coordinates are "real" units; the map screen shows them divided
// by 459 and shifted. These are the formulas from the site's map code.

/** Real game position to the map coordinates shown in game */
export const toInGame = (pos: { X: number; Y: number }): [number, number] => [
  Math.round((pos.Y + 301000) / 459 - 1000),
  Math.round((pos.X + 582888) / 459 - 1000),
];

/** The World Tree's area of the game world, from the site's map data */
export const TREE_REAL = {
  minX: 347351.5,
  maxX: 689148.5,
  minY: -818197,
  maxY: -476400,
};
export const isOnTree = (pos: { X: number; Y: number }) =>
  pos.X >= TREE_REAL.minX &&
  pos.X <= TREE_REAL.maxX &&
  pos.Y >= TREE_REAL.minY &&
  pos.Y <= TREE_REAL.maxY;

// The World Tree has its own scale on the in-game map: 0.75 units per 1000 real
// ones, which matches all 15 of its statues to within a unit
const TREE_SCALE = 0.00075;
const TREE_CENTRE = { x: 0, y: 776.6 };
const treeMiddle = {
  X: (TREE_REAL.minX + TREE_REAL.maxX) / 2,
  Y: (TREE_REAL.minY + TREE_REAL.maxY) / 2,
};
const treeHalf = ((TREE_REAL.maxX - TREE_REAL.minX) / 2) * TREE_SCALE;

/** What the World Tree picture covers, in in-game coordinates */
export const TREE_BOUNDS = {
  left: TREE_CENTRE.x - treeHalf,
  right: TREE_CENTRE.x + treeHalf,
  top: TREE_CENTRE.y + treeHalf,
  bottom: TREE_CENTRE.y - treeHalf,
};

/** Which map a real position is on, and its in-game coordinates there */
export function place(pos: { X: number; Y: number }) {
  if (!isOnTree(pos)) {
    const [x, y] = toInGame(pos);
    return { map: 'world' as const, x, y };
  }
  return {
    map: 'tree' as const,
    x: Math.round(TREE_CENTRE.x + (pos.Y - treeMiddle.Y) * TREE_SCALE),
    y: Math.round(TREE_CENTRE.y + (pos.X - treeMiddle.X) * TREE_SCALE),
  };
}

/** One JSON value from one of the site's map data scripts */
export function mapData<T>(script: string, name: string): T {
  const at = script.indexOf(`${name} = `);
  if (at < 0) throw new Error(`No ${name} in the map data`);
  const start = at + name.length + 3;
  // the values are a single JSON literal, so count brackets to find its end
  let depth = 0;
  let inString = false;
  for (let i = start; i < script.length; i++) {
    const c = script[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') {
      if (--depth === 0) return JSON.parse(script.slice(start, i + 1)) as T;
    }
  }
  throw new Error(`Unfinished ${name} in the map data`);
}
