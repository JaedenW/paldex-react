// Pulls where-to-find data for every Pal from the Palworld wiki on wiki.gg:
// wild spawn points (day and night), Alpha boss coordinates, dungeons, raid
// bosses and named regions. Writes src/data/obtain.json and one lazy-loaded
// file of spawn points per Pal in public/habitats.
// Bosses are matched to the markers in src/data/worldmap.json, so a Pal's page and
// the world map agree, and World Tree regions come from the wording of each page,
// since the wiki's habitat data stops at the main islands.
// Run with `npm run scrape:obtain` (needs pals.json, worldmap.json and gear/items.json).
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
import type { Boss, Item, Obtain, Pal, Spawns } from '../src/types.ts';
import type { MapMarker } from '../src/Utils/worldmap.ts';

const pals = await readJson<Pal[]>('src/data/pals.json');
const { markers: mapMarkers } = await readJson<{ markers: MapMarker[] }>(
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

// spaces only after the =, or an empty field would swallow the next line
const field = (body: string, key: string): string =>
  body.match(new RegExp(`\\|\\s*${key}\\s*=[ \\t]*(.*)`))?.[1]?.trim() ?? '';

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

// Regions of the World Tree, each with a fast-travel statue of the same name
const treeRegions = mapMarkers.filter(
  (m) => m.map === 'tree' && m.layer === 'statue'
);
// "Gilded City" alone can mean the one on Sunreach
const TREE_ALIASES: [RegExp, string][] = [
  [
    /Gilded City(?! Ruins)[^.]*World Tree|World Tree[^.]*Gilded City(?! Ruins)/,
    'Gilded City Ruins',
  ],
];

function treeHabitat(prose: string[]): Obtain['tree'] {
  // "save for the area around X" rules a region out
  const text = prose.join('\n').replace(/\b(?:save for|except)\b[^.\n]*/g, '');
  const places = treeRegions.filter(
    (r) =>
      text.includes(r.name) ||
      TREE_ALIASES.some(([re, name]) => name === r.name && re.test(text))
  );
  const widespread =
    /\b(?:most places|throughout|various spots)\b[^.]*World Tree|found in The World Tree/.test(
      text
    );
  if (places.length === 0 && !widespread && !/\bWorld Tree\b/.test(text))
    return undefined;
  return {
    places: places.map((p) => p.id),
    ...(widespread || places.length === 0 ? { widespread: true } : {}),
  };
}

/** The Pal's markers on the world map, with bosses the page didn't list added */
function matchBosses(pal: Pal, fromPage: Boss[]): Boss[] {
  const own = mapMarkers.filter(
    (m) => m.pal === pal.id && (m.layer === 'alpha' || m.layer === 'predator')
  );
  const used = new Set<string>();
  const bosses = fromPage.map((b) => {
    const m = own.find((x) => x.x === b.x && x.y === b.y);
    if (!m) {
      // the app adds a marker for this one, so both maps show it
      if (b.x === undefined) return b;
      const layer = b.variant === 'Predator' ? 'predator' : 'alpha';
      return { ...b, markerId: `${layer}/${pal.id}/${b.x},${b.y}` };
    }
    used.add(m.id);
    return {
      ...b,
      map: m.map,
      markerId: m.id,
      level: m.level ?? b.level,
      location: m.region ?? b.location,
      ...(m.approximate ? { approximate: true } : {}),
    };
  });
  for (const m of own) {
    if (used.has(m.id)) continue;
    // a page entry that gave no coordinates is usually this same boss
    const unplaced = bosses.find(
      (b) => b.x === undefined && b.variant.toLowerCase() === m.layer
    );
    const boss: Boss = {
      variant: m.layer === 'alpha' ? 'Alpha' : 'Predator',
      location: m.region ?? unplaced?.location ?? '',
      level: m.level ?? unplaced?.level ?? null,
      x: m.x,
      y: m.y,
      map: m.map,
      markerId: m.id,
      ...(m.approximate ? { approximate: true } : {}),
    };
    if (unplaced) bosses[bosses.indexOf(unplaced)] = boss;
    else bosses.push(boss);
  }
  return bosses;
}

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
// Which temperature each egg wants, from the table on the Pal Eggs page
const eggPage = (await wikitext(['Pal Eggs'])).get('Pal Eggs') ?? '';
const eggTemperature = new Map(
  [
    ...eggPage.matchAll(
      /^\|\s*\{\{\s*(?:i|icon)\s*\|([^}|]+)\}\}\s*\n\|\s*(Warm|Hot|Cool|Cold|Normal|Very [A-Z]\w+)\s*$/gim
    ),
  ].map((m) => [m[1]?.trim() ?? '', m[2]?.trim() ?? ''])
);
if (eggTemperature.size < 10)
  throw new Error(
    'Could not read the egg table; the Pal Eggs page may have changed'
  );

const predatorText = fragments.get('Map:Fragments/Predator Pals');
if (!predatorText) throw new Error('Could not read the predator Pals map data');
const predators =
  (JSON.parse(predatorText) as Fragment).markers.predator_pals ?? [];

// Named regions each Pal is listed under
const regions = new Map<string, Set<string>>();
const alphaLevels = new Map<string, number>();
for (let offset = 0; ; offset += 500) {
  const json = await api<CargoResponse>({
    action: 'cargoquery',
    tables: 'LocationEntity',
    fields: 'locationName,entityName,variantType,level',
    where: 'entityType="pal"',
    limit: '500',
    offset: String(offset),
  });
  for (const { title: r } of json.cargoquery) {
    if (r.variantType === 'Alpha' && r.level)
      alphaLevels.set(r.entityName ?? '', Number(r.level));
    const set = regions.get(r.entityName ?? '') ?? new Set<string>();
    set.add((r.locationName ?? '').replace(/''/g, "'"));
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
  if (prose.length) entry.prose = prose;

  const names = [...(regions.get(pal.name) ?? [])].sort();
  if (names.length) entry.regions = names;

  const tree = treeHabitat(prose);
  if (tree) entry.tree = tree;

  // Alpha, predator and other single-spawn bosses with coordinates
  const bosses: Boss[] = [];
  for (const m of text.matchAll(/\{\{Entity Location Map([\s\S]*?)\n\}\}/g)) {
    const body = m[1] ?? '';
    const c = field(body, 'coords').match(
      /\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?/
    );
    const x = c ? Math.round(Number(c[1])) : 0;
    const y = c ? Math.round(Number(c[2])) : 0;
    bosses.push({
      variant: field(body, 'variant') || 'Alpha',
      location: field(body, 'location'),
      level: Number(field(body, 'level')) || null,
      map: 'world',
      // an unfilled template, or one left at the wiki's placeholder of 0, 0
      ...(x === 0 && y === 0 ? {} : { x, y }),
    });
  }
  // a few pages give an Alpha's position in a sentence instead of the template
  const inWords = (tabs.get('Alpha (Overworld)') ?? '').match(
    /found (?:on|in|at) (?:the )?([^.(]+?) at \(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/
  );
  if (inWords)
    bosses.push({
      variant: 'Alpha',
      location: inWords[1]?.trim() ?? '',
      level: alphaLevels.get(pal.name) ?? null,
      map: 'world',
      x: Number(inWords[2]),
      y: Number(inWords[3]),
    });
  for (const p of predators) {
    if (p.article?.replace(/ \(Predator\)$/, '') === pal.name) {
      bosses.push({
        variant: 'Predator',
        location: '',
        level: null,
        x: Math.round(p.x),
        y: Math.round(p.y),
        map: 'world',
        note: stripMarkup((p.description ?? []).join(' ')) || undefined,
      });
    }
  }
  const matched = matchBosses(pal, bosses);
  if (matched.length) entry.bosses = matched;

  const dungeons = [...(tabs.get('Dungeons') ?? '').matchAll(/^\*\s*(.+)$/gm)]
    .map((m) => {
      const [name = '', ...note] = stripMarkup(m[1]).split(/:\s*/);
      return { name, note: note.join(': ') || undefined };
    })
    .filter((d) => d.name !== 'DUNGEONNAME'); // unfilled template on new pages
  if (dungeons.length) entry.dungeons = dungeons;

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
