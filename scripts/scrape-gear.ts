// Builds items, equipment stats, recipes, buildings, technologies and where
// items come from out of paldb.cc's item, building and technology pages. The wiki
// on wiki.gg adds its notes on gathering. Writes JSON into src/data/gear, with
// small WebP icons in public/items and public/buildings (--no-images skips those).
// Run with `npm run scrape:gear` (needs src/data/pals.json).
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  cardFacts,
  cardText,
  headings,
  num,
  page,
  tidy,
  type Page,
} from './paldb.ts';
import {
  cargo,
  imageUrls,
  readJson,
  root,
  slug,
  sleep,
  UA,
  unusedNames,
  wikitext,
} from './wiki.ts';
import type {
  Building,
  GearStats,
  Item,
  ItemSources,
  Pal,
  Rarity,
  Recipe,
  Tech,
} from '../src/types.ts';

const outDir = path.join(root, 'src/data/gear');
const skipImages = process.argv.includes('--no-images');

const LISTS = [
  'Weapon',
  'Sphere',
  'Sphere_Module',
  'Armor',
  'Accessory',
  'Material',
  'Consumable',
  'Ammo',
  'Ingredient',
  'Key_Items',
  'Glider',
  'Schematic',
  'Schematics',
  'Skill_Fruit',
  'Legendary',
  'Production',
  'Pal',
  'Storage',
  'Food',
  'Infrastructure',
  'Lighting',
  'Foundations',
  'Defenses',
  'Furniture',
  'Other',
];

/** paldb's building types, in the words the app uses */
const BUILDING_TYPES: Record<string, string> = {
  Production: 'Production',
  Storage: 'Storage',
  Infrastructure: 'Infrastructure',
  Pal: 'Pal',
  Lighting: 'Lighting',
  Defenses: 'Defense',
  Other: 'Other Structures',
  Food: 'Food',
  Furniture: 'Furniture',
  Foundations: 'Foundation',
};
const ITEM_TYPES: Record<string, string> = { 'Key Items': 'Key Item' };

const SUBTYPES: [RegExp, string][] = [
  [/^WeaponMelee/, 'Melee'],
  [/^Weapon(Bow|Crossbow)/, 'Bow'],
  [/^WeaponThrow/, 'Thrown'],
  [/^WeaponFishingRod/, 'Fishing rod'],
  [/^WeaponGrapplingGun/, 'Grappling gun'],
  [/^Weapon/, 'Gun'],
  [/^ArmorHead/, 'Headgear'],
  [/^ArmorBody/, 'Body armor'],
  [/^Shield/, 'Shield'],
  [/^ConsumeWazaMachine/, 'Skill fruit'],
  [/^ConsumeBullet/, 'Ammo'],
  [/^Food/, 'Food'],
  [/^Drug|^Medicine|^ConsumeBandage/, 'Medicine'],
  [/^MaterialPalEgg/, 'Pal egg'],
  [/^MaterialMonster/, 'Pal material'],
  [/^Material/, 'Material'],
  [/^Essential_PalGear/, 'Pal gear'],
  [/^Prod_Craft/, 'Crafting'],
  [/^Prod_Furnace/, 'Furnace'],
  [/^Prod_Resource/, 'Resources'],
  [/^Prod_Medicine/, 'Medicine'],
];

/** A paldb file name as words */
const words = (s: string) => tidy(s.replace(/_/g, ' '));

function range(text: string) {
  const [min, max] = tidy(text).split(/[–-]/);
  return { min: num(min) ?? undefined, max: num(max ?? min) ?? undefined };
}
const percent = (s: string) => num(tidy(s).replace('%', '')) ?? undefined;

/** Drop undefined fields so the JSON stays small */
const compact = <T extends object>(o: T): T =>
  Object.fromEntries(
    Object.entries(o).filter(
      ([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)
    )
  ) as T;

console.log('Reading the item lists…');
const hrefs = new Set<string>();
for (const list of LISTS) {
  const $ = await page(list);
  $?.('a.itemname[href]').each((_, a) => {
    const href = $(a).attr('href') ?? '';
    if (href && !/[?#/]/.test(href)) hrefs.add(href);
  });
}
console.log(`${hrefs.size} pages to read`);

const pals = await readJson<Pal[]>('src/data/pals.json');
const palNames = new Set(pals.map((p) => p.name));
const unused = await unusedNames();

const items = new Map<string, Item>();
const buildings = new Map<string, Building>();
const recipes: Recipe[] = [];
const sources: Record<string, ItemSources> = {};
const icons = new Map<string, { file: string; url: string; name: string }>();

const source = (
  name: string
): ItemSources & Required<Pick<ItemSources, 'shops' | 'found' | 'dropped'>> =>
  (sources[name] ??= { shops: [], found: [], dropped: [] }) as never;

/** Recipes in a Production card; a card with stations lists one recipe per bench */
function readRecipes(
  $: Page,
  heading: Parameters<Page>[0],
  kind: Recipe['kind'],
  quality: Rarity | undefined,
  product: string
) {
  const card = $(heading).parent();
  const stations = card
    .find('.row a.itemname')
    .toArray()
    .map((a) => tidy($(a).text()));
  card.find('tbody tr').each((_, tr) => {
    const cells = $(tr).children('td');
    const materials = cells.eq(0);
    const ingredients = materials
      .find('a.itemname')
      .toArray()
      .map((a) => ({
        name: tidy($(a).text()),
        qty: num(tidy($(a).nextAll('small.itemQuantity').first().text())) ?? 1,
      }));
    if (ingredients.length === 0) return;
    const workload = num(
      tidy(
        materials
          .find('img[src*="T_icon_status_05"]')
          .parent()
          .find('small')
          .text()
      )
    );
    const made = cells.eq(1);
    const name = tidy(made.find('a').first().text()) || product;
    if (name !== product) return; // a workbench's page also lists all it makes
    const schematic = tidy(cells.eq(2).find('a').first().text());
    const base = {
      product: name,
      kind,
      qty: num(tidy(made.find('small.itemQuantity').first().text())) ?? 1,
      workload: workload ?? undefined,
      quality: quality && quality !== 'Common' ? quality : undefined,
      ingredients: ingredients.sort((a, b) => a.name.localeCompare(b.name)),
      schematic: schematic || undefined,
    };
    if (kind === 'building' || stations.length === 0)
      recipes.push(compact(base));
    else
      for (const station of stations)
        recipes.push(compact({ ...base, station }));
  });
}

/** Shops that take something other than Gold Coins */
const OTHER_CURRENCY = /Bounty|Medal|Arena/;
const SHOPS: [RegExp, string][] = [
  [/^Wander/, 'Wandering Merchant'],
  [/^Vagrant/, 'Vagrant Trader'],
  [/^Caravan/, 'Caravan Merchant'],
  [/^Dungeon/, 'Dungeon Merchant'],
  [/^Bounty/, 'Bounty Merchant'],
  [/^Medal/, 'Medal Merchant'],
  [/^Arena/, 'Arena Merchant'],
];

/** A chest or reward table's internal name, in plain words */
function lootLabel(raw: string) {
  const label = words(raw);
  if (
    /^(DevTest|Test|AssaultRifle|CharacterSpawnItem|Wood$|Stone$)/i.test(label)
  )
    return undefined;
  if (/Default\d*$/.test(label) || !/[a-z]/.test(label) || !/\s/.test(label))
    return undefined;
  return label
    .replace(/^Treasure (\w+) Grade 0?(\d+)/i, '$1 chest (grade $2)')
    .replace(/^Junk (\w+?)(\d*)$/i, '$1 junk pile')
    .replace(/^Expedition (.+)$/i, '$1 expedition')
    .replace(/^(\w+?)0?(\d*) Drop( \d+)?$/i, '$1 ground loot')
    .replace(/Grass\b/, 'Grassland')
    .replace(/Dessert/, 'Desert');
}

function readSources($: Page, name: string, cost: number | undefined) {
  const shops = new Set<string>();
  for (const h of headings($, 'Wandering Merchant')) {
    $(h)
      .parent()
      .find('tbody tr')
      .each((_, tr) => {
        const raw = words(tidy($(tr).children('td').eq(1).text())).replace(
          /\s*\d+(\s+\d+)*$/,
          ''
        );
        const merchant =
          SHOPS.find(([re]) => re.test(raw))?.[1] ??
          (raw ? `${raw} merchant` : '');
        if (!merchant || shops.has(merchant)) return;
        shops.add(merchant);
        source(name).shops.push(
          compact(
            OTHER_CURRENCY.test(merchant)
              ? { merchant }
              : { merchant, cost, currency: cost ? 'Gold Coin' : undefined }
          )
        );
      });
  }
  const found = new Map<string, NonNullable<ItemSources['found']>[number]>();
  for (const h of headings($, 'Treasure Box')) {
    $(h)
      .parent()
      .find('tbody tr')
      .each((_, tr) => {
        const cells = $(tr).children('td');
        const label = lootLabel(tidy(cells.eq(0).text()));
        if (!label) return;
        const ranch = label.match(/^(.+?) Ranch\d*$/);
        if (ranch) {
          const row = {
            category: 'Ranch',
            label: `Produced by ${ranch[1]}`,
            ...range(cells.eq(2).text()),
          };
          found.set(`Ranch|${row.label}`, compact(row));
          return;
        }
        const category = /expedition/i.test(label)
          ? 'Expedition'
          : /^Mission/i.test(label)
            ? 'Mission'
            : /Critic|Foodie/i.test(label)
              ? 'Reward'
              : /fish/i.test(label)
                ? 'Fishing'
                : 'Chest';
        const row = compact({
          category,
          label,
          chance: percent(cells.eq(3).text()),
          ...range(cells.eq(2).text()),
        });
        const known = found.get(`${category}|${label}`);
        if (!known || (row.chance ?? 0) > (known.chance ?? 0))
          found.set(`${category}|${label}`, row);
      });
  }
  if (found.size) source(name).found.push(...found.values());
  const targets = new Set<string>();
  for (const h of headings($, 'Dropped By')) {
    $(h)
      .parent()
      .find('tbody tr')
      .each((_, tr) => {
        const cells = $(tr).children('td');
        const target = tidy(cells.eq(0).text());
        if (!target || palNames.has(target) || target.startsWith('Test'))
          return;
        if (targets.has(target)) return;
        targets.add(target);
        source(name).dropped.push(
          compact({
            target,
            type: 'Human',
            chance: percent(cells.eq(2).text()),
            ...range(cells.eq(1).text()),
          })
        );
      });
  }
}

for (const href of hrefs) {
  const $ = await page(href);
  if (!$) continue;
  const popups = $('.col-lg-4 .card.itemPopup').toArray();
  const stats = headings($, 'Stats');
  const others = headings($, 'Others');
  if (!popups.length || !stats.length || !stats[0]) continue;
  const first = $(popups[0]);
  const pageName = tidy(first.find('.hover_banner a.itemname').first().text());
  if (!pageName || palNames.has(pageName)) continue;
  const facts = cardFacts($, stats[0]);
  const rawType = facts.get('Type') ?? '';
  const isBuilding = rawType in BUILDING_TYPES || !facts.has('MaxStackCount');

  if (isBuilding) {
    if (buildings.has(pageName) || unused.has(pageName)) continue;
    const other = others[0] ? cardFacts($, others[0]) : new Map();
    const id = slug(pageName);
    buildings.set(
      pageName,
      compact({
        id,
        name: pageName,
        type: BUILDING_TYPES[rawType] ?? 'Other Structures',
        subtype: SUBTYPES.find(([re]) =>
          re.test(other.get('TypeB') ?? '')
        )?.[1],
        description: cardText(first.find('.card-body').first().text()) || undefined,
        hp: num(other.get('Hp')) ?? undefined,
        capacity: num(facts.get('Slots')) ?? undefined,
      })
    );
    const icon = first.find('.hover_icon_bg img').attr('src');
    if (icon)
      icons.set(`buildings/${id}`, {
        file: `buildings/${id}.webp`,
        url: icon,
        name: pageName,
      });
    for (const h of headings($, 'Production'))
      readRecipes($, h, 'building', undefined, pageName);
    continue;
  }

  // Each block of stats is one quality of an item, or one named tier of it:
  // a page can hold Attack Pendant, +1 and +2, or five qualities of Advanced Bow.
  const blocks: {
    name: string;
    quality: Rarity | undefined;
    gear: GearStats;
    buy?: number;
    weight?: number;
    other: Map<string, string>;
    type: string;
    food?: Map<string, string>;
    description: string;
    icon?: string;
  }[] = [];
  let block = -1;
  for (const h of $('h5.card-title').toArray()) {
    const title = tidy($(h).text());
    if (title === 'Stats') {
      block++;
      const popup = $(popups[block]);
      const name = tidy(popup.find('.hover_banner a.itemname').first().text());
      const s = cardFacts($, h);
      const coinRow = $(h)
        .parent()
        .children('div')
        .filter(
          (_, r) => tidy($(r).children('div').first().text()) === 'Gold Coin'
        );
      const tip = coinRow.find('[data-bs-title]').attr('data-bs-title') ?? '';
      const quality = (s.get('Rarity') ?? undefined) as Rarity | undefined;
      blocks.push({
        name: name || pageName,
        quality,
        type: s.get('Type') ?? rawType,
        buy: num(s.get('Gold Coin')) ?? undefined,
        weight: num(s.get('Weight')) ?? undefined,
        description: tidy(popup.find('.card-body').first().text()),
        icon: popup.find('.hover_icon_bg img').attr('src'),
        other: new Map(),
        gear: compact({
          quality,
          sell: num(tip.match(/Sell:\s*([\d.]+)/)?.[1]) ?? undefined,
          durability: num(s.get('Durability')) ?? undefined,
          attack: num(s.get('Attack')) ?? undefined,
          defense: num(s.get('Defense')) ?? undefined,
          health: num(s.get('Health')) ?? undefined,
          shield: num(s.get('Shield')) ?? undefined,
          capture:
            num(
              tidy(popup.find('.hover_icon_bg').text()).match(
                /Capture Power\s*(\d+)/
              )?.[1]
            ) ?? undefined,
        }),
      });
    }
    const current = blocks[block];
    if (!current) continue;
    if (title === 'Others') current.other = cardFacts($, h);
    else if (title === 'Foods') current.food = cardFacts($, h);
    else if (title === 'Production') {
      // only a later tier of the same item is an upgrade; a saddle's Legendary
      // is simply its rarity
      const upgrade = blocks.findIndex((x) => x.name === current.name) < block;
      readRecipes(
        $,
        h,
        'item',
        upgrade ? current.quality : undefined,
        current.name
      );
    }
  }

  const byName = new Map<string, typeof blocks>();
  for (const b of blocks)
    byName.set(b.name, [...(byName.get(b.name) ?? []), b]);
  for (const [name, all] of byName) {
    // a block still showing the game's "en Text" stand-in is an unfinished
    // variant, such as a second Pal Sphere with no quality
    const finished = all.filter((g) => cardText(g.description));
    const group = finished.length ? finished : all;
    const b = group[0];
    if (!b || items.has(name) || unused.has(name)) continue;
    if (/^Test|^Debug|^NewItem/i.test(name)) continue;
    const typeB = b.other.get('TypeB') ?? '';
    // not in the game, unless something actually gives it
    const given =
      headings($, 'Production').length +
        headings($, 'Treasure Box').length +
        headings($, 'Dropped By').length >
      0;
    if (!b.other.has('bLegalInGame') && !given) continue;
    const id = slug(name);
    const gear = group.map((g) =>
      compact({
        ...g.gear,
        effect:
          g.description && g.description !== b.description
            ? g.description
            : undefined,
      })
    );
    const hasStats = gear.some(
      (g) =>
        g.durability ??
        g.attack ??
        g.defense ??
        g.health ??
        g.shield ??
        g.capture
    );
    const type =
      typeB.includes('PassiveSkillChange') && b.type === 'Key Items'
        ? 'Implant'
        : (ITEM_TYPES[b.type] ?? (b.type || 'Other Item'));
    items.set(
      name,
      compact({
        id,
        name,
        type,
        subtype: SUBTYPES.find(([re]) => re.test(typeB))?.[1],
        description: cardText(b.description) || undefined,
        rarity: b.quality,
        sell: b.gear.sell,
        weight: b.weight,
        food: b.food && {
          nutrition: num(b.food.get('Nutrition')) ?? undefined,
          sanity: num(b.food.get('SAN')) ?? undefined,
          corruption:
            num(b.food.get('Corruption')?.replace(/\D/g, '')) ?? undefined,
        },
        gear: hasStats ? gear : undefined,
      })
    );
    if (name === pageName) readSources($, name, b.buy);
    if (b.icon && type !== 'Schematic')
      icons.set(`items/${id}`, { file: `items/${id}.webp`, url: b.icon, name });
  }
}

// ---- wild eggs, from the table of what hatches where
const eggPage = await page('Eggs');
if (eggPage) {
  const eggPlaces = new Map<string, Set<string>>();
  eggPage('table')
    .first()
    .find('tbody tr')
    .each((_, tr) => {
      const cells = eggPage(tr).children('td');
      const where = words(tidy(cells.eq(0).text()))
        .replace(/ grade 0?(\d+)$/i, ' (grade $1)')
        .replace(/^tenraku/i, 'Sky Islands')
        .replace(/^skyisland/i, 'Feybreak')
        .replace(/^worldtree/i, 'World Tree')
        .replace(/^glacier/i, 'Frozen')
        .replace(/^volcanic/i, 'Volcanic')
        .replace(/^grass/i, 'Grassland')
        .replace(/^desert/i, 'Desert');
      const egg = tidy(cells.eq(3).text());
      if (!egg || !where) return;
      eggPlaces.set(egg, (eggPlaces.get(egg) ?? new Set()).add(where));
    });
  for (const [egg, places] of eggPlaces)
    if (items.has(egg))
      source(egg).found.push(
        ...[...places].map((label) => ({ category: 'Wild egg', label }))
      );
}

// ---- technology
console.log('Reading technologies…');
const techPage = await page('Technologies');
if (!techPage) throw new Error('paldb.cc has no Technologies page');
const techList: Tech[] = [];
const techIds = new Set<string>();
techPage('.hoverTech').each((_, el) => {
  const t = techPage(el);
  const name = tidy(t.find('.hoverTechFooter').text());
  const level = num(
    tidy(t.parent().find('.justify-content-center').first().text())
  );
  if (!name) return;
  const ancient =
    /ancient|boss/i.test(t.attr('class') ?? '') ||
    t.closest('[id*="ncient"]').length > 0;
  let id = slug(name);
  for (let n = 2; techIds.has(id); n++) id = `${slug(name)}-${n}`;
  techIds.add(id);
  const unlocks: NonNullable<Tech['unlocks']> = [];
  if (items.has(name)) unlocks.push({ kind: 'item', name });
  if (buildings.has(name)) unlocks.push({ kind: 'building', name });
  techList.push(
    compact({
      id,
      name,
      level: level ?? 0,
      cost: num(tidy(t.find('.hoverTechCost').text())) ?? 0,
      ancient: ancient ? true : undefined,
      unlocks,
    })
  );
  const item = items.get(name);
  if (item) item.tech = name;
  const building = buildings.get(name);
  if (building) building.tech = name;
});
// the wiki knows which structures and items each set of technology unlocks
const techByName = new Map(techList.map((t) => [t.name, t]));
const [wikiStructures, wikiItems] = await Promise.all([
  cargo('Structure', ['itemName', 'techName']),
  cargo('Item', ['itemName', 'techName']),
]);
for (const [rows, list, kind] of [
  [wikiStructures, buildings, 'building'],
  [wikiItems, items, 'item'],
] as const) {
  for (const r of rows) {
    const thing = list.get(r.itemName ?? '');
    const tech = techByName.get(r.techName ?? '');
    if (!thing || !tech) continue;
    thing.tech ??= tech.name;
    const unlocks = (tech.unlocks ??= []);
    if (!unlocks.some((u) => u.name === thing.name))
      unlocks.push({ kind, name: thing.name });
  }
}
techList.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

// ---- notes from the wiki on what can't be crafted, bought or looted
const itemList = [...items.values()].sort((a, b) =>
  a.name.localeCompare(b.name)
);
const buildingList = [...buildings.values()].sort((a, b) =>
  a.name.localeCompare(b.name)
);
console.log('Fetching the wiki’s notes on gathering…');
const itemPages = await wikitext(itemList.map((i) => i.name));
const plain = (t: string) =>
  t
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(
      /\{\{\s*(?:i|icon)\s*\|([^}]*)\}\}/gi,
      (_: string, args: string) => args.split('|').pop() ?? ''
    )
    .replace(/\[\[(?:File|Category):[^\]]*\]\]/gi, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/'''?/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
for (const item of itemList) {
  const text = itemPages.get(item.name);
  if (!text) continue;
  const section =
    text.match(/===\s*Other Drops\s*===([\s\S]*?)(?=\n==|$)/)?.[1] ?? '';
  const other = [...section.matchAll(/^\*+\s*(.+)$/gm)]
    .map((m) => plain(m[1]))
    .filter(Boolean);
  if (other.length) source(item.name).other = other;
}
for (const entry of Object.values(sources)) {
  for (const k of ['shops', 'found', 'dropped'] as const)
    if (entry[k]?.length === 0) delete entry[k];
}

// paldb lists plantations as what the Mill "uses" for crops; nothing is crafted
// from them. Recipes for things the wiki flags as unused go the way of the things.
const craftable = recipes.filter(
  (r) =>
    !unused.has(r.product) &&
    !r.ingredients.some((i) => buildings.has(i.name) || unused.has(i.name))
);
recipes.length = 0;
recipes.push(...craftable);
recipes.sort(
  (a, b) =>
    a.product.localeCompare(b.product) ||
    (a.quality ?? '').localeCompare(b.quality ?? '') ||
    (a.station ?? '').localeCompare(b.station ?? '')
);

const itemNames = new Set(items.keys());
const unknownIngredients = [
  ...new Set(
    recipes
      .flatMap((r) => r.ingredients)
      .filter((i) => !itemNames.has(i.name))
      .map((i) => i.name)
  ),
];
console.log(
  `${itemList.length} items, ${buildingList.length} buildings, ${recipes.length} recipes, ${techList.length} technologies, ${unknownIngredients.length} unlisted ingredients`
);
if (unknownIngredients.length)
  console.log('  e.g.', unknownIngredients.slice(0, 10).join(', '));
if (
  itemList.length < 1000 ||
  recipes.length < 800 ||
  techList.length < 300 ||
  buildingList.length < 200
) {
  throw new Error('Far fewer rows than expected; paldb.cc may have changed');
}

// Pal drops that have an item page, so the Paldex pages can link them without loading the item data
const dropNames = new Set(
  pals.flatMap((p) => [...p.drops, ...p.alphaDrops].map((d) => d.item))
);
const linkableDrops = [...dropNames].filter((n) => itemNames.has(n)).sort();

await mkdir(outDir, { recursive: true });
await writeFile(
  path.join(root, 'src/data/unused.json'),
  JSON.stringify([...unused].sort()) + '\n'
);
await writeFile(
  path.join(root, 'src/data/dropItems.json'),
  JSON.stringify(linkableDrops) + '\n'
);
const write = (name: string, data: unknown) =>
  writeFile(path.join(outDir, name), JSON.stringify(data) + '\n');
await Promise.all([
  write('items.json', itemList),
  write('buildings.json', buildingList),
  write('recipes.json', recipes),
  write('tech.json', techList),
  write('sources.json', sources),
]);

// ---- icons
if (!skipImages) {
  const exists = (f: string) =>
    access(f).then(
      () => true,
      () => false
    );
  await mkdir(path.join(root, 'public/items'), { recursive: true });
  await mkdir(path.join(root, 'public/buildings'), { recursive: true });
  const todo: { file: string; url: string; name: string }[] = [];
  for (const icon of icons.values())
    if (!(await exists(path.join(root, 'public', icon.file)))) todo.push(icon);
  console.log(`Fetching ${todo.length} icons…`);
  const save = async (url: string, file: string) => {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return false;
    await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(96, 96, { fit: 'inside' })
      .webp({ quality: 80 })
      .toFile(path.join(root, 'public', file));
    return true;
  };
  const failed: typeof todo = [];
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(
      todo.slice(i, i + 4).map(async (icon) => {
        if (!(await save(icon.url, icon.file))) failed.push(icon);
      })
    );
    await sleep(100);
  }
  // some of paldb's files aren't served; the wikis have most of those
  const titles = failed.map((f) => `${f.name} icon.png`);
  const fromWikis = await imageUrls(titles);
  let saved = todo.length - failed.length;
  for (const f of failed) {
    const url = fromWikis.get(`${f.name} icon.png`);
    if (url && (await save(url, f.file))) saved++;
    await sleep(100);
  }
  console.log(`Saved ${saved} of ${todo.length} icons`);
}
console.log('Done.');
