// Pulls where-to-find data for every Pal from the Palworld wiki on wiki.gg:
// wild spawn points (day and night), Alpha boss coordinates, dungeons, raid
// bosses and named regions. Writes src/data/obtain.json, one lazy-loaded file
// of spawn points per Pal in public/habitats, and the world map image.
// Run with `npm run scrape:obtain` (needs src/data/pals.json from `npm run scrape`).
import { mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import path from 'node:path';
import { api, root, sleep, UA, wikitext } from './wiki.mjs';

const pals = JSON.parse(
  await readFile(path.join(root, 'src/data/pals.json'), 'utf8')
);
const habitatDir = path.join(root, 'public/habitats');
const mapFile = path.join(root, 'public/map/world.webp');
const skipImages = process.argv.includes('--no-images');

/** Wikitext to plain text: links, icons and bold markup resolved, templates dropped */
function clean(s) {
  return (s ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\{\{\s*(?:i|icon)\s*\|([^}]*)\}\}/gi, (_, args) =>
      args.split('|').pop()
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

/** The tabs of a page's Obtaining section, by heading */
function obtainingTabs(text) {
  const section =
    text.match(/==Obtaining==([\s\S]*?)(?=\n==[^=]|$)/)?.[1] ?? '';
  const tabs = new Map();
  for (const part of section.split(/^\|-\|/m).slice(1)) {
    const i = part.indexOf('=');
    tabs.set(part.slice(0, i).trim(), part.slice(i + 1));
  }
  return tabs;
}

const field = (body, key) =>
  body.match(new RegExp(`\\|\\s*${key}\\s*=\\s*(.*)`))?.[1]?.trim() ?? '';

console.log('Fetching Pal pages…');
const texts = await wikitext(pals.map((p) => p.name));

console.log('Fetching map data…');
const fragments = await wikitext([
  'Map:Fragments/Pal Habitats (A-E)',
  'Map:Fragments/Pal Habitats (F-L)',
  'Map:Fragments/Pal Habitats (M-Q)',
  'Map:Fragments/Pal Habitats (R-Z)',
  'Map:Fragments/Predator Pals',
  'Map:Fragments/Core',
]);
const markers = {};
for (const [title, text] of fragments) {
  if (title.includes('Habitats'))
    Object.assign(markers, JSON.parse(text).markers);
}
const predators = JSON.parse(fragments.get('Map:Fragments/Predator Pals'))
  .markers.predator_pals;
const crs = JSON.parse(fragments.get('Map:Fragments/Core')).crs;

// Named regions each Pal is listed under
const regions = new Map();
for (let offset = 0; ; offset += 500) {
  const json = await api({
    action: 'cargoquery',
    tables: 'LocationEntity',
    fields: 'locationName,entityName,variantType',
    where: 'entityType="pal"',
    limit: '500',
    offset: String(offset),
  });
  for (const { title: r } of json.cargoquery) {
    if (!regions.has(r.entityName)) regions.set(r.entityName, new Set());
    regions.get(r.entityName).add(r.locationName);
  }
  if (json.cargoquery.length < 500) break;
  await sleep(300);
}

await rm(habitatDir, { recursive: true, force: true });
await mkdir(habitatDir, { recursive: true });
const round = (pts) =>
  [...new Set(pts.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`))].map(
    (k) => k.split(',').map(Number)
  );

const obtain = {};
const problems = [];
for (const pal of pals) {
  const text = texts.get(pal.name);
  if (!text) {
    problems.push(`no page: ${pal.name}`);
    continue;
  }
  const tabs = obtainingTabs(text);
  const entry = {};

  // Prose from the habitat tabs, minus the wiki's unfilled placeholder comment
  const prose = [];
  for (const [heading, body] of tabs) {
    if (!heading.startsWith('Habitat')) continue;
    // a few pages have malformed tabs or unfilled placeholders; skip those lines
    const paras = clean(body)
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
  const bosses = [];
  for (const m of text.matchAll(/\{\{Entity Location Map([\s\S]*?)\n\}\}/g)) {
    const c = field(m[1], 'coords').match(
      /\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?/
    );
    if (!c) continue;
    bosses.push({
      variant: field(m[1], 'variant') || 'Alpha',
      location: field(m[1], 'location'),
      level: Number(field(m[1], 'level')) || null,
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
        note: clean((p.description ?? []).join(' ')) || undefined,
      });
    }
  }
  if (bosses.length) entry.bosses = bosses;

  const dungeons = [...(tabs.get('Dungeons') ?? '').matchAll(/^\*\s*(.+)$/gm)]
    .map((m) => {
      const [name, ...note] = clean(m[1]).split(/:\s*/);
      return { name, note: note.join(': ') || undefined };
    })
    .filter((d) => d.name !== 'DUNGEONNAME'); // unfilled template on new pages
  if (dungeons.length) entry.dungeons = dungeons;

  const raid = clean(tabs.get('Raid Boss') ?? '');
  if (raid) entry.raid = raid;

  const key = pal.name.replace(/ /g, '_');
  const spawn = {
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

const stat = (f) => Object.values(obtain).filter(f).length;
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
await writeFile(
  path.join(root, 'src/data/map.json'),
  JSON.stringify({ topLeft: crs.topLeft, bottomRight: crs.bottomRight }) + '\n'
);

if (!skipImages) {
  const exists = await access(mapFile).then(
    () => true,
    () => false
  );
  if (!exists) {
    console.log('Downloading world map…');
    const json = await api({
      action: 'query',
      titles: 'File:World_Map.webp',
      prop: 'imageinfo',
      iiprop: 'url',
    });
    const url = Object.values(json.query.pages)[0].imageinfo[0].url;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`World map download failed: ${res.status}`);
    await mkdir(path.dirname(mapFile), { recursive: true });
    await writeFile(mapFile, Buffer.from(await res.arrayBuffer()));
  }
}
console.log('Done.');
