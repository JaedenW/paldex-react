// Builds the data for the home page's world map from paldb.cc's own map data:
// fast-travel statues, towers, Alpha bosses, bounty targets, merchants, dungeons
// and enemy camps, for the main islands and the World Tree. Predator Pals and the
// map pictures come from the wiki on wiki.gg, which is where they are published.
// Writes src/data/worldmap.json and public/map.
// Run with `npm run scrape:worldmap` (needs src/data/pals.json).
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { mapData, place, text, TREE_BOUNDS } from './paldb.ts';
import {
  api,
  decodeEntities,
  readJson,
  root,
  slug,
  stripMarkup,
  UA,
  wikitext,
} from './wiki.ts';
import type { Pal } from '../src/types.ts';
import type { MapMarker } from '../src/Utils/worldmap.ts';

const pals = await readJson<Pal[]>('src/data/pals.json');
const palIdByName = new Map(pals.map((p) => [p.name, p.id]));
const mapDir = path.join(root, 'public/map');
await mkdir(mapDir, { recursive: true });

// ---- images
async function download(name: string, file: string) {
  if (
    await access(file).then(
      () => true,
      () => false
    )
  )
    return;
  const json = await api({
    action: 'query',
    titles: `File:${name}`,
    prop: 'imageinfo',
    iiprop: 'url',
  });
  const url = Object.values(json.query.pages)[0].imageinfo?.[0]?.url;
  if (!url) throw new Error(`No image for ${name}`);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Download of ${name} failed: ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}
await download('World_Map.webp', path.join(mapDir, 'world.webp'));
await download('Tree_Map.webp', path.join(mapDir, 'tree.webp'));
// small versions load first; the full ones only when someone zooms in
for (const name of ['world', 'tree']) {
  const small = path.join(mapDir, `${name}-2048.webp`);
  await sharp(path.join(mapDir, `${name}.webp`))
    .resize(2048)
    .webp({ quality: 78 })
    .toFile(small);
}

// ---- markers
interface Entry {
  type: string;
  item: string;
  pos?: { X: number; Y: number };
  ipos?: { X: number; Y: number };
  id?: string;
  lv?: number;
  comment?: string;
  boss?: string;
}

/** A name without the element icons the site puts after it */
const clean = (s: string) => s.replace(/<[^>]+>/g, '').trim();

const scripts = await Promise.all([
  text('js/map_data_en.js'),
  text('js/treemap_data_en.js'),
]);
const [worldScript, treeScript] = scripts;
if (!worldScript || !treeScript) throw new Error('No map data on paldb.cc');
const entries = [
  ...mapData<Entry[]>(worldScript, 'fixedDungeon'),
  ...mapData<Entry[]>(treeScript, 'fixedDungeon'),
];
const regionRows = mapData<Entry[]>(worldScript, 'regionData');

type NewMarker = Omit<MapMarker, 'id'>;
const markers: NewMarker[] = [];

// named places, for saying roughly where each marker is
const regions = regionRows
  .filter((r) => r.ipos && !r.id?.startsWith('REGION_Oilrig'))
  .map((r) => ({
    name: clean(r.item).replace(/^Lv\.[\d-]+\s*/, ''),
    x: r.ipos?.X ?? 0,
    y: r.ipos?.Y ?? 0,
  }));
const treeStatues = entries
  .filter((e) => e.type === 'Fast Travel' && e.pos)
  .flatMap((e) => {
    const p = place(e.pos ?? { X: 0, Y: 0 });
    return p.map === 'tree' ? [{ name: e.item, x: p.x, y: p.y }] : [];
  });
function regionAt(map: MapMarker['map'], x: number, y: number) {
  let best: string | undefined;
  let bestDist = Infinity;
  for (const r of map === 'tree' ? treeStatues : regions) {
    const d = Math.hypot(r.x - x, r.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = r.name;
    }
  }
  return best;
}

function add(
  layer: MapMarker['layer'],
  e: Entry,
  extra: Partial<NewMarker> & { name: string }
) {
  if (!e.pos) return;
  const p = place(e.pos);
  markers.push({
    layer,
    ...p,
    level: e.lv,
    region: regionAt(p.map, p.x, p.y),
    ...extra,
  });
}

for (const e of entries) {
  const name = clean(e.item);
  if (e.type === 'Fast Travel') add('statue', e, { name, level: undefined });
  else if (e.type === 'Tower') {
    const hasName = !!e.comment && !e.comment.includes('？');
    add('tower', e, { name: hasName ? (e.comment ?? name) : name, boss: name });
  } else if (e.type === 'Alpha Pal')
    add('alpha', e, {
      name,
      pal: palIdByName.get(name),
      note: e.comment === 'Dungeon Boss' ? 'Found in a dungeon' : undefined,
    });
  else if (e.type === 'Bounty') add('bounty', e, { name });
  else if (
    e.type === 'Wandering Merchant' ||
    e.type === 'Pal Merchant' ||
    e.type === 'Black Marketeer'
  )
    add('merchant', e, { name: e.type, level: undefined });
  else if (e.type === 'Dungeon') add('dungeon', e, { name });
  else if (e.type === 'Enemy Camp') add('camp', e, { name });
}
for (const r of regionRows) {
  if (!r.id?.startsWith('REGION_Oilrig') || !r.ipos) continue;
  const level = r.item.match(/Lv\.(\d+)/)?.[1];
  markers.push({
    layer: 'oilrig',
    map: 'world',
    name: clean(r.item).replace(/^Lv\.\d+\s*/, ''),
    level: level ? Number(level) : undefined,
    x: r.ipos.X,
    y: r.ipos.Y,
  });
}

// Predator Pals aren't in paldb's map data
const fragment = (await wikitext(['Map:Fragments/Predator Pals'])).get(
  'Map:Fragments/Predator Pals'
);
if (!fragment) throw new Error('Could not read the predator Pals map data');
const predators = (
  JSON.parse(fragment) as {
    markers: Record<
      string,
      {
        x: number;
        y: number;
        article?: string;
        name: string;
        description?: string[];
      }[]
    >;
  }
).markers.predator_pals;
for (const p of predators ?? []) {
  const name = stripMarkup(
    decodeEntities(p.article ?? p.name).replace(/\s*\(Predator\)$/, '')
  );
  const x = Math.round(p.x),
    y = Math.round(p.y);
  markers.push({
    layer: 'predator',
    map: 'world',
    name,
    pal: palIdByName.get(name),
    x,
    y,
    region: regionAt('world', x, y),
    note: stripMarkup((p.description ?? []).join(' ')) || undefined,
  });
}

const counts = new Map<string, number>();
for (const m of markers) {
  const k = `${m.map}/${m.layer}`;
  counts.set(k, (counts.get(k) ?? 0) + 1);
}
console.log(Object.fromEntries(counts));
const unknownPals = markers.filter(
  (m) => (m.layer === 'alpha' || m.layer === 'predator') && !m.pal
);
for (const m of unknownPals) console.log('  no such Pal:', m.layer, m.name);
if (markers.length < 300 || (counts.get('world/alpha') ?? 0) < 60)
  throw new Error('Far fewer markers than expected; paldb.cc may have changed');

// ---- the landmass on the World Tree picture, so the map opens framed on it
const N = 1024;
const { data } = await sharp(path.join(mapDir, 'tree.webp'))
  .resize(N, N)
  .raw()
  .toBuffer({ resolveWithObject: true });
let l = N,
  r = -1,
  t = N,
  b = -1;
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 3;
    if (0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2] > 55) {
      l = Math.min(l, x);
      r = Math.max(r, x);
      t = Math.min(t, y);
      b = Math.max(b, y);
    }
  }
}
const units = TREE_BOUNDS.right - TREE_BOUNDS.left;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

const seen = new Set<string>();
const id = (m: NewMarker) => {
  const base = `${m.layer}/${slug(m.name) || 'x'}/${m.x},${m.y}`;
  let unique = base;
  for (let n = 2; seen.has(unique); n++) unique = `${base}-${n}`;
  seen.add(unique);
  return unique;
};
const out = {
  maps: {
    world: {
      id: 'world',
      name: 'Palpagos Islands',
      bounds: {
        left: -1923.226,
        top: 1032.799,
        right: 1234.833,
        bottom: -2125.261,
      },
      image: '/map/world-2048.webp',
      full: '/map/world.webp',
    },
    tree: {
      id: 'tree',
      name: 'World Tree',
      bounds: Object.fromEntries(
        Object.entries(TREE_BOUNDS).map(([k, v]) => [k, round3(v)])
      ),
      focus: {
        left: round3(TREE_BOUNDS.left + (l / N) * units),
        right: round3(TREE_BOUNDS.left + (r / N) * units),
        top: round3(TREE_BOUNDS.top - (t / N) * units),
        bottom: round3(TREE_BOUNDS.top - (b / N) * units),
      },
      image: '/map/tree-2048.webp',
      full: '/map/tree.webp',
    },
  },
  markers: markers
    .sort(
      (a, b) =>
        a.map.localeCompare(b.map) ||
        a.layer.localeCompare(b.layer) ||
        a.name.localeCompare(b.name)
    )
    .map((m) => ({ id: id(m), ...m })),
};
await writeFile(
  path.join(root, 'src/data/worldmap.json'),
  JSON.stringify(out) + '\n'
);
console.log(`Wrote ${out.markers.length} markers.`);
