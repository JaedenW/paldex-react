// Pulls where-to-find data for every Pal from the Palworld wiki on wiki.gg:
// wild spawn points (day and night), Alpha boss coordinates, dungeons, raid
// bosses and named regions. Writes src/data/obtain.json and one lazy-loaded
// file of spawn points per Pal in public/habitats.
// Run with `npm run scrape:obtain` (needs src/data/pals.json from `npm run scrape`).
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  api,
  readJson,
  root,
  sleep,
  stripMarkup,
  wikitext,
  type CargoResponse,
} from './wiki.ts';
import type { Boss, Obtain, Pal, Spawns } from '../src/types.ts';

const pals = await readJson<Pal[]>('src/data/pals.json');
const habitatDir = path.join(root, 'public/habitats');

/** The tabs of a page's Obtaining section, by heading */
function obtainingTabs(text: string): Map<string, string> {
  const section =
    text.match(/==Obtaining==([\s\S]*?)(?=\n==[^=]|$)/)?.[1] ?? '';
  const tabs = new Map<string, string>();
  for (const part of section.split(/^\|-\|/m).slice(1)) {
    const i = part.indexOf('=');
    tabs.set(part.slice(0, i).trim(), part.slice(i + 1));
  }
  return tabs;
}

const field = (body: string, key: string): string =>
  body.match(new RegExp(`\\|\\s*${key}\\s*=\\s*(.*)`))?.[1]?.trim() ?? '';

/** The wiki's interactive-map data: named groups of points */
interface Fragment {
  markers: Record<
    string,
    {
      x: number;
      y: number;
      article?: string;
      name?: string;
      description?: string[];
    }[]
  >;
}

console.log('Fetching Pal pages…');
const texts = await wikitext(pals.map((p) => p.name));

console.log('Fetching map data…');
const fragments = await wikitext([
  'Map:Fragments/Pal Habitats (A-E)',
  'Map:Fragments/Pal Habitats (F-L)',
  'Map:Fragments/Pal Habitats (M-Q)',
  'Map:Fragments/Pal Habitats (R-Z)',
  'Map:Fragments/Predator Pals',
]);
const markers: Fragment['markers'] = {};
for (const [title, text] of fragments) {
  if (title.includes('Habitats'))
    Object.assign(markers, (JSON.parse(text) as Fragment).markers);
}
const predatorText = fragments.get('Map:Fragments/Predator Pals');
if (!predatorText) throw new Error('Could not read the predator Pals map data');
const predators =
  (JSON.parse(predatorText) as Fragment).markers.predator_pals ?? [];

// Named regions each Pal is listed under
const regions = new Map<string, Set<string>>();
for (let offset = 0; ; offset += 500) {
  const json = await api<CargoResponse>({
    action: 'cargoquery',
    tables: 'LocationEntity',
    fields: 'locationName,entityName,variantType',
    where: 'entityType="pal"',
    limit: '500',
    offset: String(offset),
  });
  for (const { title: r } of json.cargoquery) {
    const set = regions.get(r.entityName ?? '') ?? new Set<string>();
    set.add(r.locationName ?? '');
    regions.set(r.entityName ?? '', set);
  }
  if (json.cargoquery.length < 500) break;
  await sleep(300);
}

await rm(habitatDir, { recursive: true, force: true });
await mkdir(habitatDir, { recursive: true });
/** Whole-number points, with duplicates removed */
const round = (pts: { x: number; y: number }[]): [number, number][] =>
  [...new Set(pts.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`))].map(
    (k) => k.split(',').map(Number) as [number, number]
  );

const obtain: Record<string, Obtain> = {};
const problems: string[] = [];
for (const pal of pals) {
  const text = texts.get(pal.name);
  if (!text) {
    problems.push(`no page: ${pal.name}`);
    continue;
  }
  const tabs = obtainingTabs(text);
  const entry: Obtain = {};

  // Prose from the habitat tabs, minus the wiki's unfilled placeholder comment
  const prose: string[] = [];
  for (const [heading, body] of tabs) {
    if (!heading.startsWith('Habitat')) continue;
    // a few pages have malformed tabs or unfilled placeholders; skip those lines
    const paras = stripMarkup(body)
      .split(/\n{2,}/)
      .map((x) => x.trim())
      .filter((x) => x && !x.startsWith('|-|'));
    const label = heading.match(/\((.+)\)/)?.[1];
    prose.push(
      ...paras.map((x) =>
        label && label !== 'Overworld' ? `${label}: ${x}` : x
      )
    );
  }
  if (prose.length) entry.prose = prose;

  const names = [...(regions.get(pal.name) ?? [])].sort();
  if (names.length) entry.regions = names;

  // Alpha, predator and other single-spawn bosses with coordinates
  const bosses: Boss[] = [];
  for (const m of text.matchAll(/\{\{Entity Location Map([\s\S]*?)\n\}\}/g)) {
    const body = m[1] ?? '';
    const c = field(body, 'coords').match(
      /\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?/
    );
    if (!c) continue;
    bosses.push({
      variant: field(body, 'variant') || 'Alpha',
      location: field(body, 'location'),
      level: Number(field(body, 'level')) || null,
      x: Math.round(Number(c[1])),
      y: Math.round(Number(c[2])),
    });
  }
  for (const p of predators) {
    if (p.article?.replace(/ \(Predator\)$/, '') === pal.name) {
      bosses.push({
        variant: 'Predator',
        location: '',
        level: null,
        x: Math.round(p.x),
        y: Math.round(p.y),
        note: stripMarkup((p.description ?? []).join(' ')) || undefined,
      });
    }
  }
  if (bosses.length) entry.bosses = bosses;

  const dungeons = [...(tabs.get('Dungeons') ?? '').matchAll(/^\*\s*(.+)$/gm)]
    .map((m) => {
      const [name = '', ...note] = stripMarkup(m[1]).split(/:\s*/);
      return { name, note: note.join(': ') || undefined };
    })
    .filter((d) => d.name !== 'DUNGEONNAME'); // unfilled template on new pages
  if (dungeons.length) entry.dungeons = dungeons;

  const raid = stripMarkup(tabs.get('Raid Boss') ?? '');
  if (raid) entry.raid = raid;

  const key = pal.name.replace(/ /g, '_');
  const spawn: Spawns = {
    day: round(markers[`${key}_day`] ?? []),
    night: round(markers[`${key}_night`] ?? []),
  };
  if (spawn.day.length || spawn.night.length) {
    entry.spawns = spawn.day.length + spawn.night.length;
    await writeFile(
      path.join(habitatDir, `${pal.id}.json`),
      JSON.stringify(spawn)
    );
  }
  obtain[pal.id] = entry;
}

const stat = (has: (e: Obtain) => unknown) =>
  Object.values(obtain).filter(has).length;
console.log(
  `${stat((e) => e.spawns)} with spawn points, ${stat((e) => e.bosses)} with boss locations, ${stat((e) => e.dungeons)} with dungeons, ${stat((e) => e.raid)} raid bosses, ${stat((e) => e.prose)} with habitat text`
);
if (stat((e) => e.spawns) < 100)
  throw new Error('Far fewer habitats than expected');
for (const p of problems) console.log('  ', p);

await writeFile(
  path.join(root, 'src/data/obtain.json'),
  JSON.stringify(obtain, null, 1) + '\n'
);
console.log('Done.');
