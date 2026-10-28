// Reads the breeding rules from the Palworld wiki's Breeding page on wiki.gg:
// which Pals can be a child by breeding rank (and the index number that breaks
// ties), which can only come from their own species, and the fixed parent
// combinations for subspecies. Writes src/data/breeding.json.
// Run with `npm run scrape:breeding` (needs src/data/pals.json).
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readJson, root, wikitext } from './wiki.ts';
import type { BreedingRules, Pal } from '../src/types.ts';

const pals = await readJson<Pal[]>('src/data/pals.json');
const idByName = new Map(pals.map((p) => [p.name, p.id]));
const palByName = new Map(pals.map((p) => [p.name, p]));

const page = (await wikitext(['Breeding'])).get('Breeding');
if (!page) throw new Error('Could not read the Breeding page');
const text: string = page;

/** The part of the page under a heading, up to the next heading of the same or a higher level */
function section(heading: string): string {
  const re = new RegExp(`^(=+)\\s*${heading}\\s*\\1\\s*$`, 'm');
  const m = re.exec(text);
  if (!m)
    throw new Error(
      `Section "${heading}" not found; the wiki page may have changed`
    );
  const rest = text.slice(m.index + m[0].length);
  const next = new RegExp(`^={1,${m[1].length}}[^=].*$`, 'm').exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/** Rows of a wikitable as arrays of cell text */
const rows = (body: string): string[][] =>
  body
    .split(/\n\|-/)
    .map((r) =>
      r
        .split('\n')
        .filter(
          (l) => l.startsWith('|') && !l.startsWith('|+') && !l.startsWith('|}')
        )
        .map((l) => l.slice(1).trim())
    )
    .filter((cells) => cells.length > 0);

/** Pal names inside {{I|Name}} / {{Icon|Name}} templates, in order */
const names = (cell: string): string[] =>
  [...cell.matchAll(/\{\{\s*(?:i|icon)\s*\|([^}|]+)/gi)].map((m) =>
    m[1].trim()
  );

const unknown = new Set<string>();
const id = (name: string): string | undefined => {
  const found = idByName.get(name);
  if (!found) unknown.add(name);
  return found;
};

// Rank table: Pal | No. | Rank | Eligible Child | Index No. It stops at roughly
// Paldeck #138, so Pals after that have no entry and fall back to a rule in the app.
const pool: BreedingRules['pool'] = {};
const rankMismatch: string[] = [];
for (const [pal, , rank, eligible] of rows(section('Breeding Rank'))) {
  const name = names(pal ?? '')[0];
  const palId = name ? id(name) : undefined;
  const known = name ? palByName.get(name) : undefined;
  if (!name || !palId || !known) continue;
  pool[palId] = /^yes/i.test(eligible ?? '');
  if (Number(rank) !== known.breeding.rank)
    rankMismatch.push(
      `${name}: wiki table ${rank}, Pal data ${known.breeding.rank}`
    );
}

const isId = (x: string | undefined): x is string => !!x;

// "Same-Species Breeding": Pals that can only be bred from two of their own species
const sameOnly = rows(section('Same-Species Breeding'))
  .map((cells) => id(names(cells[1] ?? '')[0] ?? ''))
  .filter(isId);

type Combo = [string, string, string];

/** [parent, parent, child] from a child cell and a "parent + parent" cell */
function fixedPair(childCell = '', parentsCell = ''): Combo | undefined {
  const [a, b] = names(parentsCell);
  const child = id(names(childCell)[0] ?? '');
  const parentA = a ? id(a) : undefined;
  const parentB = b ? id(b) : undefined;
  return child && parentA && parentB ? [parentA, parentB, child] : undefined;
}

// Subspecies and one other Pal with fixed parents: child | parent + parent
const special: Combo[] = [
  ...rows(section('Subspecies Breeding')).map(([, child, parents]) =>
    fixedPair(child, parents)
  ),
  ...rows(section('Miscellaneous')).map(([child, parents]) =>
    fixedPair(child, parents)
  ),
].filter((c): c is Combo => !!c);

console.log(
  `${Object.keys(pool).length} Pals in the rank table (${Object.values(pool).filter(Boolean).length} eligible), ${sameOnly.length} same-species only, ${special.length} fixed combinations`
);
if (unknown.size)
  console.log('Names not matched to a Pal:', [...unknown].join(', '));
if (rankMismatch.length)
  console.log(
    `${rankMismatch.length} ranks differ from the Pal data, for example:`,
    rankMismatch.slice(0, 5).join('; ')
  );
if (
  Object.keys(pool).length < 150 ||
  sameOnly.length < 10 ||
  special.length < 40
) {
  throw new Error(
    'Far fewer rows than expected; the wiki page may have changed'
  );
}

// Katress + Wixen depends on which parent is female ("A female Wixen gives Wixen
// Noct, while a female Katress gives Katress Ignis"). The wiki lists it as two rows
// with the parents swapped, the female first.
const pairKey = (a: string, b: string) => [a, b].sort().join('|');
const seen = new Map<string, Combo[]>();
for (const [a, b, child] of special) {
  const k = pairKey(a, b);
  seen.set(k, [...(seen.get(k) ?? []), [a, b, child]]);
}
const byGender: Combo[] = [];
const fixed: Combo[] = [];
for (const rowsForPair of seen.values()) {
  (rowsForPair.length > 1 && new Set(rowsForPair.map((r) => r[2])).size > 1
    ? byGender
    : fixed
  ).push(...rowsForPair);
}
console.log(
  `${fixed.length} fixed pairs, ${byGender.length / 2 || 0} depending on gender`
);

await writeFile(
  path.join(root, 'src/data/breeding.json'),
  JSON.stringify({ pool, sameOnly, special: fixed, byGender }, null, 1) + '\n'
);
console.log('Done.');
