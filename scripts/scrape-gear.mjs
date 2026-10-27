// Pulls items, equipment stats, recipes, buildings, technologies and where
// items come from (merchants, chests, enemy drops) from the Palworld wiki on
// wiki.gg. Writes JSON into src/data/gear and small WebP icons into
// public/items and public/buildings. Run with `npm run scrape:gear`;
// pass --no-images to skip the icons.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { api, cargo, root, slug, sleep, UA, wikitext } from './wiki.mjs';

const outDir = path.join(root, 'src/data/gear');
const skipImages = process.argv.includes('--no-images');
const num = (v) =>
  v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v);
const str = (v) => (v === '' || v == null ? undefined : v);

/** Wikitext and HTML left in descriptions, reduced to plain text */
function clean(s) {
  return (s ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<span class="icon">\s*\[\[File:[^\]]*\]\]\s*<\/span>/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Drop undefined fields so the JSON stays small */
const compact = (o) =>
  Object.fromEntries(
    Object.entries(o).filter(
      ([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)
    )
  );

/** Slugs that stay unique within one table */
function slugger(label) {
  const used = new Set();
  return (name) => {
    let id = slug(name) || 'item';
    if (used.has(id))
      console.log(`  ${label}: "${name}" collides with another slug`);
    for (let n = 2; used.has(id); n++) id = `${slug(name)}-${n}`;
    used.add(id);
    return id;
  };
}

console.log('Fetching tables…');
const [
  items,
  consumables,
  equipment,
  recipes,
  ingredients,
  requirements,
  structures,
  tech,
  merchantItems,
  shopGroups,
  interact,
  defeat,
] = await Promise.all([
  cargo('Item', [
    'itemName',
    'itemType',
    'subtype',
    'description',
    'sellValue',
    'weight',
    'rarity',
    'techName',
  ]),
  cargo('ItemConsumable', [
    'itemName',
    'nutrition',
    'sanity',
    'corruption',
    'consumeEffect',
  ]),
  cargo('ItemEquipment', [
    'itemName',
    'itemQuality',
    'sellValue',
    'durability',
    'attack',
    'defense',
    'healthBonus',
    'shieldValue',
    'gliderSpeed',
    'staminaDrain',
    'capturePower',
    'equipEffect',
    'ammoType',
    'barSizeRate',
  ]),
  cargo('Recipe', [
    'recipeID',
    'productName',
    'productQty',
    'workbench',
    'workload',
    'productQuality',
  ]),
  cargo('RecipeIngredient', ['recipeID', 'ingredientName', 'ingredientQty']),
  cargo('RecipeRequirement', [
    'recipeID',
    'requirementType',
    'requirementName',
    'requirementQty',
    'isConsumed',
  ]),
  cargo('Structure', [
    'itemName',
    'itemType',
    'subtype',
    'description',
    'hp',
    'capacity',
    'isSupport',
    'techName',
  ]),
  cargo('Technology', [
    'techName',
    'techLevel',
    'techCost',
    'isAncient',
    'requirement',
  ]),
  cargo('MerchantItem', [
    'shopGroup',
    'itemName',
    'costAmount',
    'currency',
    'minQty',
    'maxQty',
  ]),
  cargo('MerchantShopGroup', ['merchant', 'shopGroup']),
  cargo('DropInteract', [
    'sourceCategory',
    'sourceLabel',
    'grade',
    'itemName',
    'minQty',
    'maxQty',
    'effectiveChance',
  ]),
  cargo(
    'DropDefeat',
    [
      'targetName',
      'targetType',
      'variantType',
      'itemName',
      'chance',
      'minQty',
      'maxQty',
    ],
    'targetType!="Pal"'
  ),
]);
console.log(
  `${items.length} items, ${structures.length} buildings, ${recipes.length} recipes, ${tech.length} technologies`
);

// ---- items
const itemId = slugger('item');
const foodBy = new Map(consumables.map((c) => [c.itemName, c]));
const gearBy = new Map();
for (const e of equipment) {
  if (!gearBy.has(e.itemName)) gearBy.set(e.itemName, []);
  gearBy.get(e.itemName).push(e);
}
const QUALITY = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const itemList = items
  .map((i) => {
    const food = foodBy.get(i.itemName);
    const gear = (gearBy.get(i.itemName) ?? [])
      .sort(
        (a, b) =>
          QUALITY.indexOf(a.itemQuality) - QUALITY.indexOf(b.itemQuality)
      )
      .map((g) =>
        compact({
          quality: str(g.itemQuality),
          sell: num(g.sellValue),
          durability: num(g.durability),
          attack: num(g.attack),
          defense: num(g.defense),
          health: num(g.healthBonus),
          shield: num(g.shieldValue),
          glider: num(g.gliderSpeed),
          stamina: num(g.staminaDrain),
          capture: num(g.capturePower),
          effect: str(clean(g.equipEffect)),
          ammo: str(g.ammoType),
        })
      );
    return compact({
      id: itemId(i.itemName),
      name: i.itemName,
      type: i.itemType,
      subtype: str(i.subtype),
      description: str(clean(i.description)),
      rarity: str(i.rarity),
      sell: num(i.sellValue),
      weight: num(i.weight),
      tech: str(i.techName),
      food:
        food &&
        compact({
          nutrition: num(food.nutrition),
          sanity: num(food.sanity),
          corruption: num(food.corruption),
          effect: str(food.consumeEffect),
        }),
      gear,
    });
  })
  .sort((a, b) => a.name.localeCompare(b.name));
const itemByName = new Map(itemList.map((i) => [i.name, i]));
// recipes sometimes spell an item in different case ("stone"); use the item's own name
const byLower = new Map(itemList.map((i) => [i.name.toLowerCase(), i.name]));
const canonical = (name) => byLower.get(name.toLowerCase()) ?? name;

// ---- buildings
const structureId = slugger('building');
const structureList = structures
  .map((s) =>
    compact({
      id: structureId(s.itemName),
      name: s.itemName,
      type: str(s.itemType),
      subtype: str(s.subtype),
      description: str(clean(s.description)),
      hp: num(s.hp),
      capacity: num(s.capacity),
      support: s.isSupport === '1' ? true : undefined,
      tech: str(s.techName),
    })
  )
  .sort((a, b) => a.name.localeCompare(b.name));
const structureNames = new Set(structureList.map((s) => s.name));

// ---- recipes
const ingredientsBy = new Map();
for (const r of ingredients) {
  if (!ingredientsBy.has(r.recipeID)) ingredientsBy.set(r.recipeID, []);
  ingredientsBy.get(r.recipeID).push({
    name: canonical(r.ingredientName),
    qty: num(r.ingredientQty) ?? 1,
  });
}
const schematicBy = new Map(requirements.map((r) => [r.recipeID, r]));
const recipeList = recipes
  .map((r) => {
    const station = r.workbench === 'Unknown' ? '' : r.workbench;
    const building = station === 'Build Menu';
    const req = schematicBy.get(r.recipeID);
    return compact({
      product: building ? r.productName : canonical(r.productName),
      kind: building && structureNames.has(r.productName) ? 'building' : 'item',
      qty: num(r.productQty) ?? 1,
      station: building ? undefined : str(station),
      workload: num(r.workload),
      quality:
        r.productQuality && r.productQuality !== 'Common'
          ? r.productQuality
          : undefined,
      ingredients: (ingredientsBy.get(r.recipeID) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      schematic: req?.requirementName,
    });
  })
  .filter((r) => r.ingredients?.length)
  .sort(
    (a, b) =>
      a.product.localeCompare(b.product) ||
      (a.quality ?? '').localeCompare(b.quality ?? '')
  );

// ---- technology: each tech lists the items and buildings it unlocks
const unlocks = new Map();
const addUnlock = (techName, kind, name) => {
  if (!techName) return;
  if (!unlocks.has(techName)) unlocks.set(techName, []);
  unlocks.get(techName).push({ kind, name });
};
for (const i of itemList) addUnlock(i.tech, 'item', i.name);
for (const s of structureList) addUnlock(s.tech, 'building', s.name);
const techId = slugger('tech');
const techList = tech
  .filter((t) => t.techName !== 'Blank') // an empty placeholder row on the wiki
  .map((t) =>
    compact({
      id: techId(t.techName),
      name: t.techName,
      level: num(t.techLevel) ?? 0,
      cost: num(t.techCost) ?? 0,
      ancient: t.isAncient === '1' ? true : undefined,
      requires: str(t.requirement),
      unlocks: unlocks.get(t.techName),
    })
  )
  .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

// ---- where items come from, keyed by item name
const merchantsBy = new Map();
for (const g of shopGroups) {
  if (!merchantsBy.has(g.shopGroup)) merchantsBy.set(g.shopGroup, new Set());
  merchantsBy.get(g.shopGroup).add(g.merchant);
}
const sources = {};
const source = (name) =>
  (sources[name] ??= { shops: [], found: [], dropped: [] });
for (const m of merchantItems) {
  for (const merchant of merchantsBy.get(m.shopGroup) ?? [m.shopGroup]) {
    source(m.itemName).shops.push(
      compact({
        merchant,
        cost: num(m.costAmount),
        currency: str(m.currency),
        min: num(m.minQty),
        max: num(m.maxQty),
      })
    );
  }
}
// chests list the same loot many times over; keep the best chance per place
const foundBest = new Map();
for (const f of interact) {
  const label = f.sourceLabel || f.sourceCategory;
  const key = `${f.itemName}|${label}`;
  const chance = Math.round(Number(f.effectiveChance) * 10) / 10 || undefined;
  const cur = foundBest.get(key);
  if (!cur || (chance ?? 0) > (cur.chance ?? 0)) {
    foundBest.set(key, {
      item: f.itemName,
      row: compact({
        category: f.sourceCategory,
        label,
        chance,
        min: num(f.minQty),
        max: num(f.maxQty),
      }),
      chance,
    });
  }
}
for (const { item, row } of foundBest.values()) source(item).found.push(row);
for (const d of defeat) {
  source(d.itemName).dropped.push(
    compact({
      target: d.targetName,
      type: d.targetType,
      variant: str(d.variantType),
      chance: num(d.chance),
      min: num(d.minQty),
      max: num(d.maxQty),
    })
  );
}
// The wiki's item pages list the ways the tables above don't cover: nodes you
// mine, Pals on a ranch, production buildings, things lying on the ground.
console.log('Fetching item pages for other ways to get items…');
const itemPages = await wikitext(itemList.map((i) => i.name));
const plain = (t) =>
  t
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\{\s*(?:i|icon)\s*\|([^}]*)\}\}/gi, (_, args) => args.split('|').pop())
    .replace(/\[\[(?:File|Category):[^\]]*\]\]/gi, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/'''?/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
let withOther = 0;
for (const item of itemList) {
  const text = itemPages.get(item.name);
  if (!text) continue;
  const section = text.match(/===\s*Other Drops\s*===([\s\S]*?)(?=\n==|$)/)?.[1] ?? '';
  const other = [...section.matchAll(/^\*+\s*(.+)$/gm)].map((m) => plain(m[1])).filter(Boolean);
  if (other.length) {
    source(item.name).other = other;
    withOther++;
  }
}
console.log(`${withOther} items list other ways to get them`);

for (const entry of Object.values(sources)) {
  for (const k of ['shops', 'found', 'dropped'])
    if (entry[k].length === 0) delete entry[k];
}

// Fail loudly if the wiki's schema changes under us
if (
  itemList.length < 1000 ||
  recipeList.length < 1000 ||
  techList.length < 400 ||
  structureList.length < 300
) {
  throw new Error(
    'Far fewer rows than expected; the wiki tables may have changed'
  );
}
const unknownProducts = recipeList.filter(
  (r) => r.kind === 'item' && !itemByName.has(r.product)
);
const unknownIngredients = new Set(
  recipeList
    .flatMap((r) => r.ingredients)
    .filter((i) => !itemByName.has(i.name))
    .map((i) => i.name)
);
console.log(
  `${recipeList.length} recipes (${unknownProducts.length} with an unlisted product, ${unknownIngredients.size} unlisted ingredients)`
);
if (unknownIngredients.size)
  console.log('  e.g.', [...unknownIngredients].slice(0, 6).join(', '));

// Pal drops that have an item page, so the Paldex pages can link them without loading the item data
const pals = JSON.parse(
  await readFile(path.join(root, 'src/data/pals.json'), 'utf8')
);
const dropNames = new Set(
  pals.flatMap((p) => [...p.drops, ...p.alphaDrops].map((d) => d.item))
);
const linkableDrops = [...dropNames].filter((n) => itemByName.has(n)).sort();

await mkdir(outDir, { recursive: true });
// Totals for the home page, which shouldn't have to load the item data to count it
await writeFile(
  path.join(root, 'src/data/gearCounts.json'),
  JSON.stringify({
    items: itemList.length,
    buildings: structureList.length,
    recipes: recipeList.length,
    tech: techList.length,
  }) + '\n'
);
await writeFile(
  path.join(root, 'src/data/dropItems.json'),
  JSON.stringify(linkableDrops) + '\n'
);
const write = (name, data) =>
  writeFile(path.join(outDir, name), JSON.stringify(data) + '\n');
await Promise.all([
  write('items.json', itemList),
  write('buildings.json', structureList),
  write('recipes.json', recipeList),
  write('tech.json', techList),
  write('sources.json', sources),
]);

// ---- icons, shrunk to small WebP files (the originals are 256px or 512px PNGs)
if (!skipImages) {
  const jobs = [
    // schematics are 400+ near-identical icons, so they use a shared placeholder
    ...itemList
      .filter((i) => i.type !== 'Schematic')
      .map((i) => ({
        name: i.name,
        file: path.join(root, 'public/items', `${i.id}.webp`),
      })),
    ...structureList.map((s) => ({
      name: s.name,
      file: path.join(root, 'public/buildings', `${s.id}.webp`),
    })),
  ];
  await mkdir(path.join(root, 'public/items'), { recursive: true });
  await mkdir(path.join(root, 'public/buildings'), { recursive: true });
  const exists = (f) =>
    access(f).then(
      () => true,
      () => false
    );
  const todo = [];
  for (const j of jobs) if (!(await exists(j.file))) todo.push(j);
  console.log(`Resolving ${todo.length} icons…`);

  const urls = new Map();
  const titles = [...new Set(todo.map((j) => `File:${j.name} icon.png`))];
  for (let i = 0; i < titles.length; i += 50) {
    const json = await api({
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url',
      titles: titles.slice(i, i + 50).join('|'),
    });
    for (const page of Object.values(json.query.pages)) {
      const url = page.imageinfo?.[0]?.url;
      if (url)
        urls.set(
          page.title.replace(/^File:/, '').replace(/ icon\.png$/, ''),
          url
        );
    }
    await sleep(250);
  }

  let saved = 0;
  const download = async ({ name, file }) => {
    const url = urls.get(name);
    if (!url) return;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return;
    await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(96, 96, { fit: 'inside' })
      .webp({ quality: 80 })
      .toFile(file);
    saved++;
  };
  for (let i = 0; i < todo.length; i += 8) {
    await Promise.all(todo.slice(i, i + 8).map(download));
    await sleep(150);
    if ((i / 8) % 25 === 24)
      console.log(`  ${Math.min(i + 8, todo.length)}/${todo.length}`);
  }
  console.log(`Saved ${saved} icons`);
}
console.log('Done.');
