// Builds the data for the home page's world map from the Palworld wiki on
// wiki.gg: fast-travel statues, towers, Alpha bosses, bounty targets, predator
// Pals, oil rigs and wandering merchants, for the main islands and the World
// Tree. Writes src/data/worldmap.json and the map images in public/map.
// Run with `npm run scrape:worldmap` (needs src/data/pals.json).
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { api, cargo, root, slug, UA, wikitext } from './wiki.mjs';

const pals = JSON.parse(
  await readFile(path.join(root, 'src/data/pals.json'), 'utf8')
);
const palIdByName = new Map(pals.map((p) => [p.name, p.id]));
const mapDir = path.join(root, 'public/map');
await mkdir(mapDir, { recursive: true });

const decode = (s) =>
  (s ?? '').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/''/g, "'");
const plain = (s) =>
  decode(s)
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{\s*(?:i|icon)\s*\|([^}]*)\}\}/gi, (_, a) =>
      a.split('|').pop()
    )
    .replace(/<[^>]+>/g, '')
    .trim();
const num = (v) =>
  v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v);
const round = (n) => Math.round(n);
const markers = [];
const add = (m) => markers.push({ ...m, x: round(m.x), y: round(m.y) });

// ---- images: the main map is shared with the Pal pages; the tree is new
async function download(name, file) {
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
console.log('Fetching map images…');
await download('World_Map.webp', path.join(mapDir, 'world.webp'));
await download('Tree_Map.webp', path.join(mapDir, 'tree.webp'));
// small versions load first; the full ones only when someone zooms in
for (const name of ['world', 'tree']) {
  await sharp(path.join(mapDir, `${name}.webp`))
    .resize(2048)
    .webp({ quality: 78 })
    .toFile(path.join(mapDir, `${name}-2048.webp`));
}

// ---- Alpha bosses and bounty targets, with levels and area names
console.log('Fetching located entities…');
const located = (
  await cargo(
    'LocationEntity',
    [
      'locationName',
      'entityName',
      'entityType',
      'variantType',
      'level',
      'coords',
    ],
    'coords!=""'
  )
).map((r) => {
  const c = r.coords.match(/(-?[\d.]+)\s*,\s*(-?[\d.]+)/);
  return { ...r, x: c && Number(c[1]), y: c && Number(c[2]) };
});

// ---- the page tables: statues, towers, merchants
const pages = await wikitext([
  'Great Eagle Statue',
  'Tower',
  'Wandering Merchant',
  'Map:Fragments/Predator Pals',
  'Map:Fragments/General Groups',
]);
const need = (t) => {
  const v = pages.get(t);
  if (!v)
    throw new Error(`Could not read "${t}"; the wiki page may have moved`);
  return v;
};

const statuePage = need('Great Eagle Statue');
const treeAt = statuePage.indexOf('=== World Tree Great Eagle Statues');
if (treeAt < 0) throw new Error('World Tree statue table not found');
const statueRows = (text) =>
  [
    ...text.matchAll(
      /\|-\n\|(.+?)\n\|(.+?)\n\|\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g
    ),
  ].map((m) => ({
    name: plain(m[1]),
    region: plain(m[2]),
    x: Number(m[3]),
    y: Number(m[4]),
  }));
const worldStatues = statueRows(statuePage.slice(0, treeAt));
const treeStatues = statueRows(statuePage.slice(treeAt));
for (const s of worldStatues)
  add({
    layer: 'statue',
    map: 'world',
    name: s.name,
    region: s.region,
    x: s.x,
    y: s.y,
  });
for (const s of treeStatues)
  add({ layer: 'statue', map: 'tree', name: s.name, x: s.x, y: s.y });
const treeNames = new Set([
  ...treeStatues.map((s) => s.name),
  'The World Tree',
]);

const towerPage = need('Tower');
const towerSection = towerPage.slice(towerPage.indexOf('==List of Towers'));
for (const m of towerSection.matchAll(
  /\|-\n\|\s*(.+?)\n\|\s*(.+?)\n\|\s*(-?\d+),\s*(-?\d+)\n\|\s*(.+?)\n\|\s*(\d+)\n\|\s*(\d+)/g
)) {
  add({
    layer: 'tower',
    map: 'world',
    name: plain(m[1]),
    region: plain(m[2]),
    x: Number(m[3]),
    y: Number(m[4]),
    boss: plain(m[5]),
    level: Number(m[6]),
    hardLevel: Number(m[7]),
  });
}

for (const m of need('Wandering Merchant').matchAll(
  /^\*\s*(.+?)\s*\((-?\d+),\s*(-?\d+)\)/gm
)) {
  add({
    layer: 'merchant',
    map: 'world',
    name: plain(m[1]),
    x: Number(m[2]),
    y: Number(m[3]),
  });
}

// ---- fragments of the wiki's own interactive map: predators and oil rigs
const fragment = (title) => JSON.parse(need(title));
for (const p of fragment('Map:Fragments/Predator Pals').markers.predator_pals ??
  []) {
  const name = plain((p.article ?? p.name).replace(/\s*\(Predator\)$/, ''));
  add({
    layer: 'predator',
    map: 'world',
    name,
    pal: palIdByName.get(name),
    x: p.x,
    y: p.y,
    note: plain((p.description ?? []).join(' ')) || undefined,
  });
}
for (const p of fragment('Map:Fragments/General Groups').markers.oil_rigs ??
  []) {
  const level = num(p.name.match(/Lv\s*(\d+)/)?.[1]);
  add({
    layer: 'oilrig',
    map: 'world',
    name: plain(p.name.replace(/^Lv\s*\d+\s*/, '')),
    level,
    x: p.x,
    y: p.y,
  });
}

// ---- Alpha bosses and bounty targets
const seen = new Set();
for (const e of located) {
  if (e.x == null) continue;
  const variant = e.variantType;
  const name = decode(e.entityName);
  const key = `${variant}|${name}|${round(e.x)}|${round(e.y)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const map = treeNames.has(e.locationName) ? 'tree' : 'world';
  if (variant === 'Alpha') {
    add({
      layer: 'alpha',
      map,
      name,
      pal: palIdByName.get(name),
      region: decode(e.locationName),
      level: num(e.level),
      x: e.x,
      y: e.y,
    });
  } else if (variant === 'Bounty Target') {
    add({
      layer: 'bounty',
      map,
      name,
      region: decode(e.locationName),
      level: num(e.level),
      x: e.x,
      y: e.y,
    });
  }
}

// ---- where the World Tree picture sits in the coordinates
// The wiki gives World Tree positions in the tree's own coordinates but not how
// they line up with the picture. The statues and Alphas span the whole
// landmass, so fitting their bounding box to the landmass in the image gives a
// scale that is the same on both axes (a good sign), and known places land in
// the right terrain (the ruined city on the orange city, the summit in the
// snow). It is still an estimate, and the app says so.
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
const land = { l: l / N, r: r / N, t: t / N, b: b / N };
const treePts = markers.filter((m) => m.map === 'tree');
if (treePts.length < 10)
  throw new Error('Too few World Tree markers to place the picture');
const xs = treePts.map((m) => m.x),
  ys = treePts.map((m) => m.y);
const MARGIN = 0.03; // the outermost markers sit just inside the shoreline
const spanU = (land.r - land.l) * (1 - 2 * MARGIN),
  spanV = (land.b - land.t) * (1 - 2 * MARGIN);
const unitsU = (Math.max(...xs) - Math.min(...xs)) / spanU;
const unitsV = (Math.max(...ys) - Math.min(...ys)) / spanV;
const units = (unitsU + unitsV) / 2; // units across the whole picture
const cx = (Math.max(...xs) + Math.min(...xs)) / 2,
  cy = (Math.max(...ys) + Math.min(...ys)) / 2;
const centreU = (land.l + land.r) / 2,
  centreV = (land.t + land.b) / 2;
const treeBounds = {
  left: cx - centreU * units,
  right: cx - centreU * units + units,
  top: cy + centreV * units,
  bottom: cy + centreV * units - units,
};
console.log(
  `World Tree picture: ${units.toFixed(1)} units across (axes agree to ${((Math.abs(unitsU - unitsV) / units) * 100).toFixed(1)}%)`
);
if (Math.abs(unitsU - unitsV) / units > 0.1)
  throw new Error('The World Tree fit is no longer consistent; check the data');

const counts = {};
for (const m of markers)
  counts[`${m.map}/${m.layer}`] = (counts[`${m.map}/${m.layer}`] ?? 0) + 1;
console.log(counts);
if (
  (counts['world/statue'] ?? 0) < 50 ||
  (counts['world/alpha'] ?? 0) < 40 ||
  (counts['world/tower'] ?? 0) < 6
) {
  throw new Error(
    'Far fewer markers than expected; the wiki pages may have changed'
  );
}

const round3 = (n) => Math.round(n * 1000) / 1000;
const id = (m) => `${m.layer}/${slug(m.name) || 'x'}/${m.x},${m.y}`;
const out = {
  maps: {
    world: {
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
      name: 'World Tree',
      bounds: Object.fromEntries(
        Object.entries(treeBounds).map(([k, v]) => [k, round3(v)])
      ),
      // the landmass itself, so the map opens framed on it rather than on the empty margins
      focus: {
        left: round3(treeBounds.left + land.l * units),
        right: round3(treeBounds.left + land.r * units),
        top: round3(treeBounds.top - land.t * units),
        bottom: round3(treeBounds.top - land.b * units),
      },
      image: '/map/tree-2048.webp',
      full: '/map/tree.webp',
      approximate: true,
    },
  },
  markers: markers
    .map((m) => ({ id: id(m), ...m }))
    .sort(
      (a, b) =>
        a.map.localeCompare(b.map) ||
        a.layer.localeCompare(b.layer) ||
        a.name.localeCompare(b.name)
    ),
};
await writeFile(
  path.join(root, 'src/data/worldmap.json'),
  JSON.stringify(out) + '\n'
);
console.log(`Wrote ${out.markers.length} markers.`);
