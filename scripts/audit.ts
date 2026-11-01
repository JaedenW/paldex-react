// Checks the scraped data for gaps, and against sources it wasn't built from: the
// wiki on wiki.gg and the one on Fandom. They lag the game, so a difference usually
// means they are out of date, but it is the way to spot a scraper going wrong.
// Prints what it finds; nothing is changed. Run with `npm run audit` after the scrapers.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { gameVersion } from './paldb.ts';
import { latestVersion, readJson, root, sleep, wikitext } from './wiki.ts';
import { createBreeder } from '../src/Utils/breeding.ts';
import type {
  Building,
  BreedingRules,
  Item,
  ItemSources,
  Obtain,
  Pal,
  Recipe,
  Tech,
  WorkType,
} from '../src/types.ts';

const pals = await readJson<Pal[]>('src/data/pals.json');
const rules = await readJson<BreedingRules>('src/data/breeding.json');
const items = await readJson<Item[]>('src/data/gear/items.json');
const buildings = await readJson<Building[]>('src/data/gear/buildings.json');
const recipes = await readJson<Recipe[]>('src/data/gear/recipes.json');
const techs = await readJson<Tech[]>('src/data/gear/tech.json');
const sources = await readJson<Record<string, ItemSources>>(
  'src/data/gear/sources.json'
);
const obtain = await readJson<Record<string, Obtain>>('src/data/obtain.json');
const meta = await readJson<{ scrapedAt: string; gameVersion: string }>(
  'src/data/meta.json'
);

const section = (title: string) => console.log(`\n== ${title}`);
const show = (list: string[], n = 8) =>
  list.slice(0, n).forEach((x) => console.log('  ', x));
const gap = (label: string, names: string[]) => {
  console.log(`${label}: ${names.length}`);
  if (names.length) console.log('  ', names.slice(0, 10).join(', '));
};
const file = (...parts: string[]) =>
  existsSync(path.join(root, 'public', ...parts));

section('Version');
const paldb = await gameVersion();
const wiki = await latestVersion();
console.log(`Our data: ${meta.gameVersion}, scraped ${meta.scrapedAt}`);
console.log(`paldb.cc: ${paldb.version} (${paldb.date})`);
console.log(`wiki.gg:  ${wiki.version} (${wiki.date})`);

section('Gaps in the Pals');
const names = (list: Pal[]) => list.map((p) => p.name);
gap('No elements', names(pals.filter((p) => !p.elements.length)));
gap('No description', names(pals.filter((p) => !p.description)));
gap('No Alpha stats', names(pals.filter((p) => !p.alphaStats)));
gap(
  'No full art',
  names(pals.filter((p) => !file('pals', `${p.id}-art.webp`)))
);
gap('No icon', names(pals.filter((p) => !file('pals', `${p.id}.png`))));
gap('No active skills', names(pals.filter((p) => !p.activeSkills.length)));
gap('No breeding rank', names(pals.filter((p) => !p.breeding.rank)));
gap(
  'No wild spawns, boss or dungeon',
  names(
    pals.filter((p) => {
      const e = obtain[p.id];
      return (
        !e?.spawns &&
        !e?.treeSpawns &&
        !e?.bosses?.length &&
        !e?.dungeons?.length &&
        !e?.raid
      );
    })
  )
);

section('Gaps in items and buildings');
const known = new Set(items.map((i) => i.name));
const made = new Set(recipes.map((r) => r.product));
gap(
  'Items with no icon',
  items
    .filter((i) => i.type !== 'Schematic' && !file('items', `${i.id}.webp`))
    .map((i) => i.name)
);
gap(
  'Buildings with no icon',
  buildings.filter((b) => !file('buildings', `${b.id}.webp`)).map((b) => b.name)
);
gap(
  'Items with no way to get them',
  items
    .filter(
      (i) => i.type !== 'Schematic' && !made.has(i.name) && !sources[i.name]
    )
    .map((i) => i.name)
);
gap(
  'Ingredients that are not items',
  [...new Set(recipes.flatMap((r) => r.ingredients.map((i) => i.name)))].filter(
    (n) => !known.has(n)
  )
);
gap(
  'Technologies that unlock nothing listed',
  techs.filter((t) => !t.unlocks?.length).map((t) => t.name)
);

section('Breeding against the wiki’s listed pairs');
const breeder = createBreeder(pals, rules);
const texts = await wikitext(pals.map((p) => p.name));
const byName = new Map(pals.map((p) => [p.name, p]));
let agree = 0;
const differ: string[] = [];
for (const [name, text] of texts) {
  const block = text.match(/\|uniqueCombos\s*=([\s\S]*?)\n\}\}/)?.[1] ?? '';
  for (const m of block.matchAll(
    /([^+=;\n]+?)\s*\+\s*([^+=;\n]+?)\s*=\s*([^;\n]+)/g
  )) {
    const a = byName.get(m[1]?.trim() ?? '');
    const b = byName.get(m[2]?.trim() ?? '');
    if (!a || !b || a === b) continue;
    const ours = breeder.breed(a, b).name;
    // a page can name its own Pal with a template
    const theirs = (m[3]?.trim() ?? name).replace('{{PAGENAME}}', name);
    if (ours === theirs) agree++;
    else differ.push(`${a.name} + ${b.name}: wiki ${theirs}, ours ${ours}`);
  }
}
console.log(`${agree} agree, ${differ.length} differ`);
show(differ);

section('Pals against Fandom');
const fandom = new Map<string, string>();
for (let i = 0; i < pals.length; i += 40) {
  const params = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    action: 'query',
    redirects: '1',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    titles: pals
      .slice(i, i + 40)
      .map((p) => p.name)
      .join('|'),
  });
  const res = await fetch(`https://palworld.fandom.com/api.php?${params}`, {
    headers: { 'User-Agent': 'paldex-audit/1.0' },
  });
  const json = (await res.json()) as {
    query: {
      pages: {
        title: string;
        revisions?: { slots: { main: { content: string } } }[];
      }[];
    };
  };
  for (const p of json.query.pages)
    fandom.set(p.title, p.revisions?.[0]?.slots.main.content ?? '');
  await sleep(200);
}
const field = (t: string, k: string) =>
  t.match(new RegExp(`\\|\\s*${k}\\s*=\\s*([^|\\n}]*)`))?.[1]?.trim();
const WORK: [WorkType, string][] = [
  ['Kindling', 'kindling'],
  ['Watering', 'watering'],
  ['Planting', 'planting'],
  ['Generating Electricity', 'gen_electric'],
  ['Handiwork', 'handiwork'],
  ['Gathering', 'gathering'],
  ['Lumbering', 'lumbering'],
  ['Mining', 'mining'],
  ['Medicine Production', 'med_prod'],
  ['Cooling', 'cooling'],
  ['Transporting', 'transporting'],
  ['Farming', 'farming'],
];
const off: string[] = [];
let checked = 0;
for (const p of pals) {
  const t = fandom.get(p.name);
  if (!t) continue;
  checked++;
  const same = (
    label: string,
    key: string,
    ours: number | null | undefined
  ) => {
    const theirs = field(t, key);
    if (theirs && Number(theirs) !== ours)
      off.push(`${p.name} ${label}: ours ${ours}, Fandom ${theirs}`);
  };
  same('breeding rank', 'breedpower', p.breeding.rank);
  same('food', 'food', p.hunger);
  same('HP', 'hp', p.stats.hp);
  same('attack', 'attack', p.stats.attack);
  same('defense', 'defense', p.stats.defense);
  same('walk', 'walkspeed', p.stats.walk);
  same('run', 'runspeed', p.stats.run);
  for (const [work, key] of WORK) same(work, key, p.work[work] ?? 0);
}
console.log(`${checked} Pals checked: ${off.length} differences`);
show(off, 20);

console.log('\nDone.');
