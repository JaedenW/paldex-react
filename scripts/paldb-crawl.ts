// Fills the page cache in one go, at the same limited pace as everything else:
// the Pals, then every item and building. Run with `npm run scrape:crawl`.
import { page, text } from './paldb.ts';

const LISTS = [
  'Pals',
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
  'Technologies',
  'Active_Skills',
  'Passive_Skills',
  'Humans',
  'Dungeons',
  'Eggs',
  'Raid',
  'Alpha_Pals',
  'Rampaging',
  'Pal_Merchant',
  'Black_Marketeer',
  'Wandering_Merchant',
  'Fishing',
];

const links = new Set<string>();
for (const list of LISTS) {
  const $ = await page(list);
  if (!$) {
    console.log(`  no page: ${list}`);
    continue;
  }
  $('a.itemname[href]').each((_, a) => {
    const href = $(a).attr('href') ?? '';
    if (href && !/[?#/]/.test(href)) links.add(href);
  });
  console.log(`${list}: ${links.size} links so far`);
}

let done = 0;
await Promise.all(
  [...links].map(async (href) => {
    await text(`en/${href}`);
    if (++done % 200 === 0) console.log(`  ${done}/${links.size}`);
  })
);
console.log(`Done: ${links.size} pages.`);
