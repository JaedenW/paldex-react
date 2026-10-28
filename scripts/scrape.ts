// Pulls Pal data from the Palworld wiki on wiki.gg (a fan wiki) via its Cargo
// tables and writes JSON into src/data. Run with `npm run scrape`.
// Icons are saved to public/pals; pass --no-images to skip downloading them.
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import {
  api,
  cargo,
  latestVersion,
  root,
  slug,
  sleep,
  UA,
  type Row,
  unusedNames,
  wikitext as fetchWikitext,
} from './wiki.ts';

const dataDir = path.join(root, 'src/data');
const imgDir = path.join(root, 'public/pals');
const skipImages = process.argv.includes('--no-images');

const unused = await unusedNames();
const game = await latestVersion();

const num = (v: string | null | undefined) =>
  v === '' || v == null ? null : Number(v);
const clean = (s: string | null | undefined): string =>
  (s ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{i\|([^}|]*)[^}]*\}\}/g, '$1')
    .replace(
      /<span class="link-icon"[^>]*><span class="icon">[^<]*<\/span>\s*([^<]*)<\/span>/g,
      '$1'
    )
    .replace(/<[^>]+>/g, '')
    .replace(/'''?/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
const group = (rows: Row[], key: string) => {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const k = r[key] ?? '';
    const list = map.get(k) ?? [];
    list.push(r);
    map.set(k, list);
  }
  return map;
};

console.log('Fetching Cargo tables…');
const [
  pals,
  elements,
  work,
  activeLinks,
  activeSkills,
  passiveLinks,
  passives,
  stats,
  breeding,
  partner,
  drops,
] = await Promise.all([
  cargo('Pal', [
    'palName',
    'paldeckNumber',
    'palSize',
    'hungerRate',
    'isNocturnal',
    'sellPrice',
    'internalName',
  ]),
  cargo('PalElement', ['palName', 'element']),
  cargo('PalWorkSuitability', ['palName', 'workType', 'level']),
  cargo('PalActiveSkill', ['palName', 'activeSkillName', 'level']),
  cargo('ActiveSkill', [
    'activeSkillName',
    'description',
    'element',
    'cooldownTime',
    'power',
    'isSkillFruit',
    'isBossSkill',
    'isInheritable',
  ]),
  cargo('PalPassiveSkill', ['palName', 'passiveSkillName']),
  cargo('PassiveSkill', ['passiveSkillName', 'rank', 'description']),
  cargo('PalStat', [
    'palName',
    'palVariant',
    'baseHp',
    'baseAttack',
    'baseDefense',
    'baseWorkSpeed',
    'stamina',
    'slowWalkSpeed',
    'walkSpeed',
    'runSpeed',
    'rideSprintSpeed',
    'transportSpeed',
    'swimSpeed',
    'swimDashSpeed',
    'expRatio',
    'captureRate',
  ]),
  cargo('PalBreeding', [
    'palName',
    'breedingRank',
    'maleProbability',
    'isUniqueCombo',
    'palEgg',
    'combiDuplicatePriority',
  ]),
  cargo('PalPartnerSkill', ['palName', 'partnerSkill', 'description', 'type']),
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
    'targetType="Pal"'
  ),
]);
console.log(
  `${pals.length} pals, ${activeSkills.length} active skills, ${passives.length} passives`
);

// Wikitext holds the Palpedia blurb and the unique breeding combinations.
console.log('Fetching page wikitext…');
const wikitext = await fetchWikitext(pals.map((p) => p.palName));

const byPal = (rows: Row[]) => group(rows, 'palName');
const elementsBy = byPal(elements),
  workBy = byPal(work),
  activeBy = byPal(activeLinks);
const passiveBy = byPal(passiveLinks),
  statsBy = byPal(stats),
  breedingBy = byPal(breeding);
const partnerBy = byPal(partner),
  dropsBy = group(
    drops.filter((d) => !unused.has(d.itemName)),
    'targetName'
  );

const uniqueCombos: [string, string, string][] = [];
const result = pals
  .filter((p) => p.paldeckNumber) // unreleased and internal entries have no Paldeck number
  .map((p) => {
    const text = wikitext.get(p.palName) ?? '';
    const blurb = text.match(/\{\{Palpedia\|([\s\S]*?)\}\}\s*\n/)?.[1];
    const title = text.match(/\|alpha_title\s*=\s*(.*)/)?.[1]?.trim();
    const combos = text.match(/\|uniqueCombos\s*=([\s\S]*?)\n\}\}/)?.[1] ?? '';
    for (const m of combos.matchAll(
      /([^+=;\n]+?)\s*\+\s*([^+=;\n]+?)\s*=\s*([^;\n]+)/g
    )) {
      uniqueCombos.push([m[1]!.trim(), m[2]!.trim(), m[3]!.trim()]);
    }
    const s = (variant: string) => {
      const row = (statsBy.get(p.palName) ?? []).find(
        (r) => r.palVariant === variant
      );
      return (
        row && {
          hp: num(row.baseHp),
          attack: num(row.baseAttack),
          defense: num(row.baseDefense),
          workSpeed: num(row.baseWorkSpeed),
          stamina: num(row.stamina),
          slowWalk: num(row.slowWalkSpeed),
          walk: num(row.walkSpeed),
          run: num(row.runSpeed),
          rideSprint: num(row.rideSprintSpeed),
          transport: num(row.transportSpeed),
          swim: num(row.swimSpeed),
          swimDash: num(row.swimDashSpeed),
          expRatio: num(row.expRatio),
          captureRate: num(row.captureRate),
        }
      );
    };
    const br = breedingBy.get(p.palName)?.[0];
    const ps = partnerBy.get(p.palName)?.[0];
    const palDrops = (variant: string) =>
      (dropsBy.get(p.palName) ?? [])
        .filter((d) => (d.variantType || 'Normal') === variant)
        .map((d) => ({
          item: d.itemName,
          chance: num(d.chance),
          min: num(d.minQty),
          max: num(d.maxQty),
        }));
    return {
      id: slug(p.palName),
      name: p.palName,
      number: p.paldeckNumber,
      title: title ? clean(title) : undefined,
      description: blurb ? clean(blurb) : undefined,
      elements: (elementsBy.get(p.palName) ?? [])
        .map((e) => e.element)
        .filter(Boolean),
      size: p.palSize,
      work: Object.fromEntries(
        (workBy.get(p.palName) ?? []).map((w) => [w.workType, num(w.level)])
      ),
      hunger: num(p.hungerRate),
      nocturnal: p.isNocturnal === '1',
      sellPrice: num(p.sellPrice),
      stats: s('Normal'),
      alphaStats: s('Alpha'),
      partnerSkill: ps && {
        name: ps.partnerSkill,
        type: ps.type,
        description: clean(ps.description),
      },
      activeSkills: (activeBy.get(p.palName) ?? [])
        .map((a) => ({ name: a.activeSkillName, level: num(a.level) }))
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0)),
      passiveSkills: (passiveBy.get(p.palName) ?? []).map(
        (x) => x.passiveSkillName
      ),
      breeding: br && {
        rank: num(br.breedingRank),
        maleProbability: num(br.maleProbability),
        egg: br.palEgg,
        priority: num(br.combiDuplicatePriority),
        unique: br.isUniqueCombo === '1',
      },
      drops: palDrops('Normal'),
      alphaDrops: palDrops('Alpha'),
    };
  })
  .sort(
    (a, b) =>
      a.number.localeCompare(b.number, 'en', { numeric: true }) ||
      a.name.localeCompare(b.name)
  );

const skills = activeSkills
  .map((s) => ({
    id: slug(s.activeSkillName),
    name: s.activeSkillName,
    description: clean(s.description),
    element: s.element,
    cooldown: num(s.cooldownTime),
    power: num(s.power),
    fruit: s.isSkillFruit === '1',
    boss: s.isBossSkill === '1',
    inheritable: s.isInheritable === '1',
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
const passiveList = passives
  .map((p) => ({
    id: slug(p.passiveSkillName),
    name: p.passiveSkillName,
    rank: num(p.rank),
    description: clean(p.description),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const nameToId = new Map(result.map((p) => [p.name, p.id]));
const combosOut = uniqueCombos
  .filter(([a, b, c]) => nameToId.has(a) && nameToId.has(b) && nameToId.has(c))
  .map(([a, b, c]) => [nameToId.get(a), nameToId.get(b), nameToId.get(c)]);
const dedup = [
  ...new Map(
    combosOut.map((c) => [[...c.slice(0, 2).sort(), c[2]].join('|'), c])
  ).values(),
];

// Sanity checks so a wiki schema change fails loudly instead of shipping empty data
const missing = result.filter(
  (p) => !p.stats || !p.elements.length || !p.breeding
);
console.log(
  `${result.length} pals, ${dedup.length} unique combos, ${missing.length} incomplete`
);
if (result.length < 200) throw new Error('Far fewer Pals than expected');
for (const p of missing.slice(0, 10))
  console.log('  incomplete:', p.name, p.number);

await mkdir(dataDir, { recursive: true });
const write = (name: string, data: unknown) =>
  writeFile(path.join(dataDir, name), JSON.stringify(data, null, 1) + '\n');
await Promise.all([
  write('pals.json', result),
  write('skills.json', skills),
  write('passives.json', passiveList),
  write('combos.json', dedup),
  write('meta.json', {
    source: 'https://palworld.wiki.gg',
    scrapedAt: new Date().toISOString().slice(0, 10),
    gameVersion: game.version,
    gameVersionDate: game.date,
  }),
]);

if (!skipImages) {
  console.log('Resolving icons…');
  await mkdir(imgDir, { recursive: true });
  const files = result.flatMap((p) => [
    `File:${p.name} icon.png`,
    `File:${p.name}1.webp`,
  ]);
  const urls = new Map<string, string>();
  for (let i = 0; i < files.length; i += 50) {
    const json = await api({
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url',
      titles: files.slice(i, i + 50).join('|'),
    });
    for (const page of Object.values(json.query.pages)) {
      const url = page.imageinfo?.[0]?.url;
      if (url) urls.set(page.title.replace(/^File:/, ''), url);
    }
    await sleep(300);
  }
  // Variants (Noct, Cryst…) often lack art of their own; those fall back to the placeholder in the UI
  const exists = (f: string) =>
    access(f).then(
      () => true,
      () => false
    );
  const download = async (url: string, file: string) => {
    if (await exists(file)) return;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) await writeFile(file, Buffer.from(await res.arrayBuffer()));
  };
  const jobs: (() => Promise<void>)[] = [];
  for (const p of result) {
    const icon = urls.get(`${p.name} icon.png`),
      art = urls.get(`${p.name}1.webp`);
    if (icon) jobs.push(() => download(icon, path.join(imgDir, `${p.id}.png`)));
    if (art)
      jobs.push(() => download(art, path.join(imgDir, `${p.id}-art.webp`)));
  }
  for (let i = 0; i < jobs.length; i += 8) {
    await Promise.all(jobs.slice(i, i + 8).map((j) => j()));
    await sleep(150);
  }
  console.log(`Saved ${jobs.length} images`);
}
console.log('Done.');
