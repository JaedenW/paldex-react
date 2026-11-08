// Builds the Pal data from paldb.cc: every Pal with its stats, work, skills,
// drops and breeding values, the active and passive skills, and the breeding
// rules. Writes pals.json, skills.json, passives.json, breeding.json and meta.json
// into src/data, with icons and art in public/pals (--no-images skips those).
// Run with `npm run scrape`. The wiki on wiki.gg adds the one thing paldb has no
// place for: the category of each partner skill.
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  cardFacts,
  cdn,
  gameVersion,
  headings,
  num,
  page,
  palSource,
  tidy,
  type Page,
} from './paldb.ts';
import {
  cargo,
  fandomArtNames,
  imageUrls,
  root,
  sleep,
  slug,
  UA,
} from './wiki.ts';
import type {
  ActiveSkill,
  BreedingRules,
  Drop,
  Element,
  Pal,
  PalStats,
  PassiveSkill,
  WorkType,
} from '../src/types.ts';

const dataDir = path.join(root, 'src/data');
const imgDir = path.join(root, 'public/pals');
const skipImages = process.argv.includes('--no-images');

const SIZES: Record<string, string> = {
  XS: 'Extra Small',
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  XL: 'Extra Large',
};
/** The game's names for the elements */
const ELEMENT_CODES: Record<string, Element> = {
  Normal: 'Neutral',
  Fire: 'Fire',
  Water: 'Water',
  Leaf: 'Grass',
  Electricity: 'Electric',
  Ice: 'Ice',
  Earth: 'Ground',
  Dark: 'Dark',
  Dragon: 'Dragon',
};

/** A card's label and value rows; a page can have later cards for another form of the Pal */
function facts($: Page, heading: string) {
  const first = headings($, heading)[0];
  return first ? cardFacts($, first) : new Map<string, string>();
}

function stats($: Page): PalStats {
  const s = facts($, 'Stats');
  const m = facts($, 'Movement');
  const o = facts($, 'Others');
  return {
    hp: num(s.get('Health')),
    attack: num(s.get('Attack')),
    defense: num(s.get('Defense')),
    workSpeed: num(s.get('Work Speed')),
    stamina: num(m.get('Stamina')),
    slowWalk: num(m.get('SlowWalkSpeed')),
    walk: num(m.get('WalkSpeed')),
    run: num(m.get('RunSpeed')),
    rideSprint: num(m.get('RideSprintSpeed')),
    transport: num(m.get('TransportSpeed')),
    swim: num(m.get('SwimSpeed')),
    swimDash: num(m.get('SwimDashSpeed')),
    expRatio: num(o.get('ExpRatio')),
    captureRate: num(s.get('CaptureRateCorrect')),
  };
}

/** Rows of a Possible Drops table */
function drops($: Page, alpha: boolean): Drop[] {
  const out: Drop[] = [];
  const seen = new Set<string>();
  // only the first table of each kind: a later one belongs to another form
  const card = $('h5.card-title')
    .toArray()
    .find((h) => {
      const title = tidy($(h).text());
      return (
        title.includes('Possible Drops') && title.includes('Alpha') === alpha
      );
    });
  if (!card) return out;
  {
    $(card)
      .parent()
      .find('tbody tr')
      .each((_, tr) => {
        const cells = $(tr).children('td');
        const item = tidy(cells.eq(0).find('a').first().text());
        if (!item) return;
        const [min, max] = tidy(cells.eq(1).text()).split(/[–-]/);
        const level = num(tidy(cells.eq(2).text()));
        const key = `${item}|${level ?? ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
          item,
          chance: num(tidy(cells.eq(3).text()).replace('%', '')),
          min: num(min),
          max: num(max ?? min),
          ...(level ? { minLevel: level } : {}),
        });
      });
  }
  return out;
}

const palName = ($: Page, a: Parameters<Page>[0]) => tidy($(a).text());

/** Parent, parent and child from a page's Unique Combo lines */
function uniqueCombos($: Page) {
  const out: { a: string; b: string; child: string; female?: string }[] = [];
  $('span:contains("Unique Combo")')
    .parent()
    .children('div')
    .each((_, row) => {
      const parts = $(row).find('a[data-pal-id]').toArray();
      if (parts.length !== 3) return;
      const [a, b, child] = parts.map((x) => palName($, x));
      if (!a || !b || !child) return;
      const female = parts
        .slice(0, 2)
        .find((x) =>
          ($(x).next('img').attr('src') ?? '').includes('Gender_Female')
        );
      out.push({ a, b, child, female: female && palName($, female) });
    });
  return out;
}

console.log('Reading the Pal list…');
const list = await page('Pals');
if (!list) throw new Error('paldb.cc has no Pals page');
const listed: { name: string; href: string; code: string; number: string }[] =
  [];
list('.col[data-filters]').each((_, col) => {
  const a = list(col).find('a.itemname[data-pal-id]').first();
  const no = tidy(list(col).find('span.text-white-50').first().text());
  const m = no.match(/#(\d+)([A-Z]?)/);
  if (!a.length || !m) return; // the list ends with Pals not in the Paldeck
  listed.push({
    name: tidy(a.text()),
    href: a.attr('href') ?? '',
    code: a.attr('data-pal-id') ?? '',
    number: `${(m[1] ?? '').padStart(3, '0')}${m[2] ?? ''}`,
  });
});
console.log(`${listed.length} Pals listed`);
if (listed.length < 250) throw new Error('Far fewer Pals than expected');

// the wiki sorts partner skills into categories
const wikiPartner = await cargo('PalPartnerSkill', ['palName', 'type']);
const partnerType = new Map(wikiPartner.map((r) => [r.palName, r.type]));

const pals: Pal[] = [];
const ignoreCombi = new Map<string, boolean>();
const combos: ReturnType<typeof uniqueCombos> = [];
const problems: string[] = [];

for (const entry of listed) {
  const $ = await page(entry.href);
  if (!$) {
    problems.push(`no page: ${entry.name}`);
    continue;
  }
  const s = facts($, 'Stats');
  const o = facts($, 'Others');
  // the skill cards further down the page use the same element banner
  const elements = [
    ...new Set(
      $('.page-content div[style*="T_prt_palstatus_element"] > span')
        .first()
        .parent()
        .parent()
        .find('span')
        .toArray()
        .map((x) => tidy($(x).text()) as Element)
    ),
  ].slice(0, 2);
  if (!elements.length)
    for (const k of ['ElementType1', 'ElementType2']) {
      const e = ELEMENT_CODES[o.get(k) ?? ''];
      if (e) elements.push(e);
    }

  // the Alpha form has a page of its own, named with its title
  const bossLink = $('a[data-pal-id]')
    .filter((_, x) => /^boss_/i.test($(x).attr('data-pal-id') ?? ''))
    .first();
  const bossHref = bossLink.attr('href');
  const boss$ = bossHref ? await page(bossHref) : undefined;
  // the Tribes table names the Alpha in full, "The Cat's Pajamas Cattiva"
  const tribeName = $('td')
    .toArray()
    .map((td) => tidy($(td).text()))
    .find((t) => t.endsWith(` ${entry.name}`) && t !== entry.name);
  const fromHref =
    bossHref?.endsWith(`_${entry.href}`) === true
      ? decodeURIComponent(bossHref.slice(0, -entry.href.length - 1)).replace(
          /_/g,
          ' '
        )
      : undefined;
  // prefer the table's wording, which keeps apostrophes the address drops
  const tableTitle = tribeName?.slice(0, -entry.name.length - 1);
  const title =
    fromHref &&
    tableTitle &&
    tableTitle.replace(/[^\w]/g, '') === fromHref.replace(/[^\w]/g, '')
      ? tableTitle
      : fromHref;

  const work: Partial<Record<WorkType, number>> = {};
  // the first table; a later one belongs to another form of the Pal
  $('.workArray')
    .first()
    .find('a[href]')
    .each((_, a) => {
      const row = $(a).closest('.d-flex');
      const name = tidy(row.find('a').first().text()) as WorkType;
      const level = row.text().match(/Lv\s*(\d+)/)?.[1];
      if (name && level) work[name] = Number(level);
    });

  const partnerHead = tidy(
    $('a[href="Partner_Skill"]')
      .first()
      .closest('.mt-4')
      .next('div')
      .find('span')
      .first()
      .text()
  );
  const partnerText = tidy(
    $('a[href="Partner_Skill"]')
      .first()
      .closest('.mt-4')
      .nextAll('.d-flex')
      .first()
      .find('.flex-grow-1')
      .first()
      .contents()
      .filter((_, n) => n.type === 'text')
      .text()
  );

  // the first Active Skills card; a second one belongs to another form
  const activeSkills: Pal['activeSkills'] = [];
  const skillCard = headings($, 'Active Skills')[0];
  $(skillCard ?? [])
    .parent()
    .find('.card.activeSkill')
    .each((_, card) => {
      const head = $(card).find('.itemHead').first();
      const level = head.text().match(/Lv\.?\s*(\d+)/)?.[1];
      const name = tidy(head.find('a').first().text());
      if (level && name) activeSkills.push({ name, level: Number(level) });
    });

  combos.push(...uniqueCombos($));
  ignoreCombi.set(slug(entry.name), o.get('IgnoreCombi') === '1');
  const rank = num(s.get('CombiRank'));
  if (rank === null) problems.push(`no breeding rank: ${entry.name}`);

  const summary = $('h5.card-title')
    .filter((_, h) => tidy($(h).text()) === 'Summary')
    .parent()
    .clone();
  summary.find('h5').remove();

  pals.push({
    id: slug(entry.name),
    name: entry.name,
    number: entry.number,
    code: entry.code,
    title,
    description: tidy(summary.text()) || undefined,
    elements,
    size: SIZES[s.get('Size') ?? ''] ?? s.get('Size') ?? '',
    work,
    hunger: num(o.get('FoodAmount')),
    nocturnal: o.get('Nocturnal') === '1',
    sellPrice: num(s.get('Gold Coin')),
    stats: stats($),
    alphaStats: boss$ ? stats(boss$) : undefined,
    partnerSkill: partnerHead
      ? {
          name: partnerHead,
          type: partnerType.get(entry.name) ?? '',
          description: partnerText,
        }
      : undefined,
    activeSkills,
    passiveSkills: [
      ...new Set(
        $('.mt-4')
          .filter((_, x) => tidy($(x).text()) === 'Passive Skills')
          .first()
          .nextUntil('.mt-4')
          .find('[class*="passive-rank"]')
          .toArray()
          .map((x) => tidy($(x).text()).replace(/’/g, "'"))
      ),
    ],
    breeding: {
      rank: rank ?? 0,
      maleProbability: num(s.get('MaleProbability')),
      egg: s.get('Egg') ?? '',
      priority: num(o.get('CombiDuplicatePriority')),
      unique: false,
    },
    drops: drops($, false),
    alphaDrops: drops(boss$ ?? $, !boss$),
  });
}
if (pals.length < 250) throw new Error('Far fewer Pals than expected');

// ---- breeding rules
const idOf = new Map(pals.map((p) => [p.name, p.id]));
const crossed = combos.filter(
  (c) => c.a !== c.b && idOf.has(c.a) && idOf.has(c.b) && idOf.has(c.child)
);
const uniqueKids = new Set(crossed.map((c) => idOf.get(c.child)));
for (const p of pals) p.breeding.unique = uniqueKids.has(p.id);
const seen = new Set<string>();
const special: BreedingRules['special'] = [];
const byGender: BreedingRules['byGender'] = [];
for (const c of crossed) {
  const a = idOf.get(c.a) ?? '',
    b = idOf.get(c.b) ?? '',
    child = idOf.get(c.child) ?? '';
  const female = c.female ? idOf.get(c.female) : undefined;
  const row: [string, string, string] =
    female === b ? [b, a, child] : [a, b, child];
  const key = row.join('|');
  if (seen.has(key)) continue;
  seen.add(key);
  (female ? byGender : special).push(row);
}
// Subspecies (a letter on their number) with a recipe never come out of the rank
// lookup; a base species can have a recipe and still be reached by rank
const pool = Object.fromEntries(
  pals.map((p) => [
    p.id,
    !ignoreCombi.get(p.id) &&
      !(uniqueKids.has(p.id) && /[A-Z]$/.test(p.number)),
  ])
);
const sameOnly = pals
  .filter((p) => ignoreCombi.get(p.id) && !uniqueKids.has(p.id))
  .map((p) => p.id);
const breeding: BreedingRules = { pool, sameOnly, special, byGender };
console.log(
  `${Object.values(pool).filter(Boolean).length} Pals in the breeding pool, ${sameOnly.length} same-species only, ${special.length} fixed pairs, ${byGender.length} depending on gender`
);

// ---- skills
console.log('Reading skills…');
const skillPage = await page('Active_Skills');
if (!skillPage) throw new Error('paldb.cc has no Active_Skills page');
const skills = new Map<string, ActiveSkill>();
for (const tab of [
  'ActiveSkills',
  'BreedingOnlyActiveSkills',
  'BossActiveSkills',
]) {
  skillPage(`#${tab} .card.activeSkill`).each((_, card) => {
    const c = skillPage(card);
    const name = tidy(c.find('.itemHead a').first().text());
    // the boss tab also lists the game's internal names for raid boss moves
    if (!name || skills.has(name) || name.startsWith('Unique_')) return;
    const figures = c.find('span[style*="73ffff"]');
    const description = tidy(c.find('.card-body').text());
    skills.set(name, {
      id: slug(name),
      name,
      description,
      element: tidy(
        c.find('div[style*="T_prt_palstatus_element"] span').text()
      ) as Element,
      cooldown: num(figures.eq(0).text()),
      power: num(figures.eq(1).text()),
      fruit: c.find('a[href^="Skill_Fruit"]').length > 0,
      boss: tab === 'BossActiveSkills',
      inheritable: !description.includes('exclusive skill'),
    });
  });
}
const skillList = [...skills.values()].sort((a, b) =>
  a.name.localeCompare(b.name)
);
for (const p of pals)
  for (const s of p.activeSkills)
    if (!skills.has(s.name))
      problems.push(`${p.name}: unknown skill ${s.name}`);

/** A passive's effects from the site's tooltip, as a readable line */
function effects(tip: string) {
  return tip
    .split('</div>')
    .map((line) =>
      tidy(line.replace(/<[^>]+>/g, ' '))
        .replace(/_/g, ' ')
        .replace(/\(ToSelf\)/, '')
        .replace(/\(ToTrainer\)/, '(you)')
        .replace(/\(ToSelfAndTrainer\)/, '(it and you)')
        .replace(/\(ToBaseCampPal\)/, '(Pals at base)')
        .trim()
    )
    .filter((line) => line && !/^Weight\b/.test(line) && !/[+-]0%/.test(line))
    .join('. ');
}

console.log('Reading passives…');
const passivePage = await page('Passive_Skills');
if (!passivePage) throw new Error('paldb.cc has no Passive_Skills page');
const passiveList: PassiveSkill[] = [];
passivePage('#PalPassiveSkills [class*="passive_banner_rank"]').each((_, b) => {
  const banner = passivePage(b);
  const label = banner.find('[class*="passive-rank"]').first();
  const name = tidy(label.text()).replace(/’/g, "'");
  const rank = (label.attr('class') ?? '').match(/passive-rank(-?)(\d+)/);
  const tip = banner.find('img.passive_img_rank').attr('data-bs-title') ?? '';
  if (!name) return;
  passiveList.push({
    id: slug(name),
    name,
    rank: rank ? Number(rank[2]) * (rank[1] ? -1 : 1) : null,
    description: effects(tip),
  });
});
if (passiveList.length < 80)
  throw new Error('Far fewer passives than expected');

for (const p of problems.slice(0, 30)) console.log('  ', p);
if (problems.length > 30) console.log(`   …and ${problems.length - 30} more`);

await mkdir(dataDir, { recursive: true });
const write = (name: string, data: unknown) =>
  writeFile(path.join(dataDir, name), JSON.stringify(data, null, 1) + '\n');
const game = await gameVersion();
await Promise.all([
  write('pals.json', pals),
  write('skills.json', skillList),
  write('passives.json', passiveList),
  write('breeding.json', breeding),
  write('meta.json', {
    source: palSource,
    scrapedAt: new Date().toISOString().slice(0, 10),
    gameVersion: game.version,
    gameVersionDate: game.date,
  }),
]);

// ---- pictures: paldb has icons; full art comes from the wikis, wiki.gg first
if (!skipImages) {
  await mkdir(imgDir, { recursive: true });
  const exists = (f: string) =>
    access(f).then(
      () => true,
      () => false
    );
  const save = async (url: string, file: string, size: number, png = false) => {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return false;
    const img = sharp(Buffer.from(await res.arrayBuffer())).resize(size, size, {
      fit: 'inside',
    });
    await (png ? img.png() : img.webp({ quality: 82 })).toFile(file);
    return true;
  };

  let icons = 0;
  for (const p of pals) {
    const file = path.join(imgDir, `${p.id}.png`);
    if (await exists(file)) continue;
    const url = cdn(
      `image/Pal/Texture/PalIcon/Normal/T_${p.code}_icon_normal.webp`
    );
    if (await save(url, file, 256, true)) icons++;
    await sleep(300);
  }
  console.log(`Saved ${icons} new icons`);

  const needArt: Pal[] = [];
  for (const p of pals)
    if (!(await exists(path.join(imgDir, `${p.id}-art.webp`)))) needArt.push(p);
  console.log(`Finding art for ${needArt.length} Pals…`);
  const urls = await imageUrls(needArt.map((p) => `${p.name}.png`));
  const unnamed = needArt.filter((p) => !urls.has(`${p.name}.png`));
  const other = await fandomArtNames(unnamed.map((p) => p.name));
  const otherUrls = await imageUrls([...other.values()]);
  let art = 0;
  for (const p of needArt) {
    const url =
      urls.get(`${p.name}.png`) ?? otherUrls.get(other.get(p.name) ?? '');
    if (!url) continue;
    if (await save(url, path.join(imgDir, `${p.id}-art.webp`), 512)) art++;
    await sleep(150);
  }
  console.log(`Saved art for ${art} Pals; ${needArt.length - art} have none`);
}
console.log('Done.');
