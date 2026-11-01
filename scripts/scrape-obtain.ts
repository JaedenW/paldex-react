// Works out how to get every Pal. Spawn points, their levels and bosses come from
// paldb.cc; the wiki on wiki.gg adds the written notes on each Pal's habitat, the
// regions it names, its dungeons and raid summons. Writes src/data/obtain.json and
// one lazy-loaded file of spawn points per Pal in public/habitats.
// Run with `npm run scrape:obtain` (needs pals.json, worldmap.json and gear/items.json).
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { json, place } from './paldb.ts';
import {
  api,
  readJson,
  root,
  sleep,
  stripMarkup,
  wikitext,
  type CargoResponse,
} from './wiki.ts';
import type { Boss, Item, Obtain, Pal, Spawns } from '../src/types.ts';
import type { MapMarker } from '../src/Utils/worldmap.ts';

const pals = await readJson<Pal[]>('src/data/pals.json');
const { markers } = await readJson<{ markers: MapMarker[] }>(
  'src/data/worldmap.json'
);
const items = await readJson<Item[]>('src/data/gear/items.json');
const itemIdByName = new Map(items.map((i) => [i.name, i.id]));
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

console.log('Fetching Pal pages from the wiki…');
const texts = await wikitext(pals.map((p) => p.name));

// Which temperature each egg wants, from the table on the wiki's Pal Eggs page
const eggPage = (await wikitext(['Pal Eggs'])).get('Pal Eggs') ?? '';
const eggTemperature = new Map(
  [
    ...eggPage.matchAll(
      /^\|\s*\{\{\s*(?:i|icon)\s*\|([^}|]+)\}\}\s*\n\|\s*(Warm|Hot|Cool|Cold|Normal|Very [A-Z]\w+)\s*$/gim
    ),
  ].map((m) => [m[1]?.trim() ?? '', m[2]?.trim() ?? ''])
);

// Named regions each Pal is listed under
const regions = new Map<string, Set<string>>();
for (let offset = 0; ; offset += 500) {
  const res = await api<CargoResponse>({
    action: 'cargoquery',
    tables: 'LocationEntity',
    fields: 'locationName,entityName',
    where: 'entityType="pal"',
    limit: '500',
    offset: String(offset),
  });
  for (const { title: r } of res.cargoquery) {
    const set = regions.get(r.entityName ?? '') ?? new Set<string>();
    set.add((r.locationName ?? '').replace(/''/g, "'"));
    regions.set(r.entityName ?? '', set);
  }
  if (res.cargoquery.length < 500) break;
  await sleep(300);
}

interface Spot {
  X: number;
  Y: number;
  lv?: number;
}
interface Distribution {
  dayTimeLocations?: { Locations?: Spot[] };
  nightTimeLocations?: { Locations?: Spot[] };
}

/** Whole-number points, with duplicates removed */
const unique = (pts: [number, number][]): [number, number][] =>
  [...new Set(pts.map((p) => p.join()))].map(
    (k) => k.split(',').map(Number) as [number, number]
  );

const obtain: Record<string, Obtain> = {};
const habitats = new Map<string, string>();
const problems: string[] = [];
for (const pal of pals) {
  const text = texts.get(pal.name) ?? '';
  if (!text) problems.push(`no wiki page: ${pal.name}`);
  const tabs = obtainingTabs(text);
  const entry: Obtain = {};

  // Prose from the habitat tabs, minus the wiki's unfilled placeholder comment
  const prose: string[] = [];
  for (const [heading, body] of tabs) {
    const alpha = heading.startsWith('Alpha');
    if (!heading.startsWith('Habitat') && !alpha) continue;
    // a few pages have malformed tabs or unfilled placeholders; skip those lines
    const paras = stripMarkup(
      body.replace(/\{\{Entity Location Map[\s\S]*?\n\}\}/g, '')
    )
      .split(/\n{2,}/)
      .map((x) => x.trim())
      .filter((x) => x && !x.startsWith('|-|'))
      .filter((x) => !alpha || !/^There (?:is|are) no\b/.test(x));
    const label = heading.match(/\((.+)\)/)?.[1];
    prose.push(
      ...paras.map((x) =>
        label && label !== 'Overworld' ? `${label}: ${x}` : x
      )
    );
  }
  if (prose.length) entry.prose = [...new Set(prose)];

  const names = [...(regions.get(pal.name) ?? [])].sort();
  if (names.length) entry.regions = names;

  const bosses: Boss[] = markers
    .filter(
      (m) => m.pal === pal.id && (m.layer === 'alpha' || m.layer === 'predator')
    )
    .map((m) => ({
      variant: m.layer === 'alpha' ? 'Alpha' : 'Predator',
      location: m.region ?? '',
      level: m.level ?? null,
      x: m.x,
      y: m.y,
      map: m.map,
      markerId: m.id,
      note: m.note,
    }));
  if (bosses.length) entry.bosses = bosses;

  const dungeons = [...(tabs.get('Dungeons') ?? '').matchAll(/^\*\s*(.+)$/gm)]
    .map((m) => {
      const [name = '', ...note] = stripMarkup(m[1]).split(/:\s*/);
      return { name, note: note.join(': ') || undefined };
    })
    .filter((d) => d.name !== 'DUNGEONNAME'); // unfilled template on new pages
  const seen = new Set<string>();
  const distinct = dungeons.filter(
    (d) => !seen.has(d.name) && seen.add(d.name)
  );
  if (distinct.length) entry.dungeons = distinct;

  const raidTab = tabs.get('Raid Boss') ?? '';
  const raid = stripMarkup(raidTab);
  if (raid) entry.raid = raid;
  const slabs = [
    ...new Set(
      [...raidTab.matchAll(/\{\{\s*(?:i|icon)\s*\|([^}|]*Slab[^}|]*)/gi)].map(
        (m) => m[1]?.trim() ?? ''
      )
    ),
  ];
  if (slabs.length)
    entry.slabs = slabs.map((name) => {
      const id = itemIdByName.get(name);
      return id ? { name, id } : { name };
    });

  const temperature = eggTemperature.get(pal.breeding.egg);
  if (temperature) entry.eggTemperature = temperature;

  // spawn points, split between the two maps
  const dist = await json<Distribution>(
    `paldex/${pal.code.toLowerCase()}.json`
  );
  const split = (spots: Spot[] = []) => {
    const out = {
      world: [] as [number, number][],
      tree: [] as [number, number][],
    };
    for (const s of spots) {
      const p = place(s);
      out[p.map].push([p.x, p.y]);
    }
    return { world: unique(out.world), tree: unique(out.tree) };
  };
  const day = split(dist?.dayTimeLocations?.Locations);
  const night = split(dist?.nightTimeLocations?.Locations);
  const levels = [
    ...(dist?.dayTimeLocations?.Locations ?? []),
    ...(dist?.nightTimeLocations?.Locations ?? []),
  ].flatMap((s) => s.lv ?? []);
  const spawn: Spawns = {
    day: day.world,
    night: night.world,
    treeDay: day.tree,
    treeNight: night.tree,
  };
  const world = spawn.day.length + spawn.night.length;
  const tree = spawn.treeDay.length + spawn.treeNight.length;
  if (world) entry.spawns = world;
  if (tree) entry.treeSpawns = tree;
  if (levels.length) entry.levels = [Math.min(...levels), Math.max(...levels)];
  if (world || tree) habitats.set(`${pal.id}.json`, JSON.stringify(spawn));
  obtain[pal.id] = entry;
}

const stat = (has: (e: Obtain) => unknown) =>
  Object.values(obtain).filter(has).length;
console.log(
  `${stat((e) => e.spawns)} with Palpagos spawns, ${stat((e) => e.treeSpawns)} with World Tree spawns, ${stat((e) => e.bosses)} with bosses, ${stat((e) => e.dungeons)} with dungeons, ${stat((e) => e.raid)} raid bosses, ${stat((e) => e.prose)} with habitat text`
);
if (stat((e) => e.spawns) < 100)
  throw new Error('Far fewer habitats than expected');
for (const p of problems) console.log('  ', p);

// Only what changed is written, and only stale files removed: recreating the
// folder each run made file sync leave "name 2.json" copies behind
await mkdir(habitatDir, { recursive: true });
for (const file of await readdir(habitatDir))
  if (!habitats.has(file)) await rm(path.join(habitatDir, file));
for (const [file, text] of habitats) {
  const target = path.join(habitatDir, file);
  const current = await readFile(target, 'utf8').catch(() => undefined);
  if (current !== text) await writeFile(target, text);
}

await writeFile(
  path.join(root, 'src/data/obtain.json'),
  JSON.stringify(obtain, null, 1) + '\n'
);
console.log('Done.');
