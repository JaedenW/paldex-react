// Cross-checks the scraped data against the wiki's own page text, which is an
// independent source from the Cargo tables the scrapers read, and against the
// wiki's list of unused content. Prints what disagrees; nothing is changed.
// Run with `npm run audit` after the scrapers.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cargo, root, wikitext } from './wiki.mjs';

const read = async (f) =>
  JSON.parse(await readFile(path.join(root, f), 'utf8'));
const pals = await read('src/data/pals.json');
const items = await read('src/data/gear/items.json');
const buildings = await read('src/data/gear/buildings.json');
const recipes = await read('src/data/gear/recipes.json');
const meta = await read('src/data/meta.json');

const section = (title) => console.log(`\n== ${title}`);
const show = (list, n = 8) =>
  list.slice(0, n).forEach((x) => console.log('  ', x));
const entities = (s) => s.replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// ---- 1. Versions: the newest the wiki knows about, and how stale our scrape is
section('Game version');
const versions = await cargo('GameVersions', ['title', 'release_date']);
versions.sort((a, b) =>
  (b['release date'] ?? '').localeCompare(a['release date'] ?? '')
);
console.log(
  `Latest version on the wiki: ${versions[0]?.title} (${versions[0]?.['release date']})`
);
console.log(`Our data was scraped on ${meta.scrapedAt}`);

// ---- 2. Content the wiki marks as unused
section('Unused content');
const unused = new Set(
  (await cargo('ContentFlag', ['itemName', 'flag'], 'flag="Unused"')).map((r) =>
    entities(r.itemName)
  )
);
const inData = [
  ...items.filter((i) => unused.has(i.name)).map((i) => `item: ${i.name}`),
  ...buildings
    .filter((b) => unused.has(b.name))
    .map((b) => `building: ${b.name}`),
  ...pals.filter((p) => unused.has(p.name)).map((p) => `pal: ${p.name}`),
  ...recipes
    .filter((r) => unused.has(r.product))
    .map((r) => `recipe for ${r.product}`),
];
console.log(
  `${unused.size} names flagged unused; ${inData.length} still in our data`
);
show(inData);

// ---- 3. Recipes: Cargo vs the {{Crafting Recipe}} blocks on the item pages
section('Recipes against item pages');
const pageNames = [
  ...new Set(recipes.filter((r) => r.kind === 'item').map((r) => r.product)),
];
const pages = await wikitext(pageNames);
const sig = (list) =>
  list
    .map((i) => `${i.name.toLowerCase()}*${i.qty}`)
    .sort()
    .join('; ');
// every way to make a thing at a bench, as a set of ingredient lists
const ours = new Map();
for (const r of recipes) {
  if (r.kind !== 'item') continue;
  const key = `${r.product}|${r.station ?? ''}|${r.quality ?? ''}`;
  if (!ours.has(key)) ours.set(key, new Set());
  ours.get(key).add(sig(r.ingredients));
}
const wiki = new Map();
for (const [title, text] of pages) {
  for (const m of text.matchAll(/\{\{Crafting Recipe([\s\S]*?)\n\}\}/g)) {
    const field = (k) =>
      m[1].match(new RegExp(`\\|\\s*${k}\\s*=\\s*(.*)`))?.[1]?.trim() ?? '';
    const product = entities(field('product') || title);
    const quality = field('quality');
    const ingredients = field('ingredients')
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => {
        const [name, qty] = x.split('*');
        return { name: entities(name.trim()), qty: Number(qty ?? 1) };
      });
    if (product.includes('{{')) continue; // a template placeholder, not an item
    // pages that spread the parameters over several lines can't be read by line; skip them
    if (!ingredients.length || /[=|]/.test(field('workbench'))) continue;
    // a page may list several benches that all make it the same way
    for (const station of field('workbench')
      .split(';')
      .map((x) => entities(x.trim()))) {
      const key = `${product}|${station}|${quality && quality !== 'Common' ? quality : ''}`;
      if (!wiki.has(key)) wiki.set(key, new Set());
      wiki.get(key).add(sig(ingredients));
    }
  }
}
let compared = 0;
const differ = [];
const pageOnly = [];
for (const [key, sigs] of wiki) {
  if (!ours.has(key)) {
    pageOnly.push(`${key}: ${[...sigs].join(' | ')}`);
    continue;
  }
  compared++;
  const missing = [...sigs].filter((x) => !ours.get(key).has(x));
  if (missing.length)
    differ.push(
      `${key}\n      page: ${missing.join(' | ')}\n      ours: ${[...ours.get(key)].join(' | ')}`
    );
}
const ourOnly = [...ours.keys()].filter(
  (k) => !wiki.has(k) && pages.has(k.split('|')[0])
);
console.log(
  `${compared} recipe variants compared: ${differ.length} differ; ${pageOnly.length} on pages but not in our data; ${ourOnly.length} in our data but not on the item's page`
);
show(differ, 6);
show(pageOnly, 6);

// ---- 4. Pals: stats and work suitability against the Pal pages
section('Pals against their pages');
const palPages = await wikitext(pals.map((p) => p.name));
const mismatches = [];
const statMap = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  workSpeed: 'work_speed',
};
for (const p of pals) {
  const text = palPages.get(p.name);
  if (!text) {
    mismatches.push(`${p.name}: no page`);
    continue;
  }
  const num = (k) => {
    const v = text.match(new RegExp(`\\|\\s*${k}\\s*=\\s*([\\d.]+)`))?.[1];
    return v === undefined ? undefined : Number(v);
  };
  for (const [ours_, key] of Object.entries(statMap)) {
    const wiki = num(key);
    if (wiki !== undefined && p.stats?.[ours_] !== wiki)
      mismatches.push(
        `${p.name} ${ours_}: ours ${p.stats?.[ours_]}, page ${wiki}`
      );
  }
  const rank = num('breeding_rank');
  if (rank !== undefined && p.breeding?.rank !== rank)
    mismatches.push(
      `${p.name} breeding rank: ours ${p.breeding?.rank}, page ${rank}`
    );
  const work = text.match(/\|\s*work_suitability\s*=\s*(.*)/)?.[1] ?? '';
  if (!work || /[<|]/.test(work)) continue; // blank or placeholder on the page
  const wikiWork = Object.fromEntries(
    work
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => x.split('@'))
      .map(([n, l]) => [n.trim(), Number(l)])
  );
  for (const [n, l] of Object.entries(wikiWork))
    if (p.work[n] !== l)
      mismatches.push(`${p.name} work ${n}: ours ${p.work[n]}, page ${l}`);
  for (const n of Object.keys(p.work))
    if (!(n in wikiWork) && work)
      mismatches.push(`${p.name} work ${n}: ours ${p.work[n]}, not on page`);
}
console.log(`${pals.length} Pals checked: ${mismatches.length} differences`);
show(mismatches, 12);

console.log('\nDone.');
