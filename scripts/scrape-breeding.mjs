// Reads the breeding rules from the Palworld wiki's Breeding page on wiki.gg:
// which Pals can be a child by breeding rank (and the index number that breaks
// ties), which can only come from their own species, and the fixed parent
// combinations for subspecies. Writes src/data/breeding.json.
// Run with `npm run scrape:breeding` (needs src/data/pals.json).
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, slug, wikitext } from './wiki.mjs';

const pals = JSON.parse(
  await readFile(path.join(root, 'src/data/pals.json'), 'utf8')
);
const idByName = new Map(pals.map((p) => [p.name, p.id]));
const palByName = new Map(pals.map((p) => [p.name, p]));

const text = (await wikitext(['Breeding'])).get('Breeding');
if (!text) throw new Error('Could not read the Breeding page');

/** The part of the page under a heading, up to the next heading of the same or a higher level */
function section(heading) {
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
const rows = (body) =>
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
const names = (cell) =>
  [...cell.matchAll(/\{\{\s*(?:i|icon)\s*\|([^}|]+)/gi)].map((m) =>
    m[1].trim()
  );

const unknown = new Set();
const id = (name) => {
  const found = idByName.get(name);
  if (!found) unknown.add(name);
  return found;
};

// Rank table: Pal | No. | Rank | Eligible Child | Index No. It stops at roughly
// Paldeck #138, so Pals after that have no entry and fall back to a rule in the app.
const pool = {};
const rankMismatch = [];
for (const [pal, , rank, eligible] of rows(section('Breeding Rank'))) {
  const name = names(pal ?? '')[0];
  const palId = name && id(name);
  if (!palId) continue;
  pool[palId] = /^yes/i.test(eligible);
  if (Number(rank) !== palByName.get(name).breeding.rank)
    rankMismatch.push(
      `${name}: wiki table ${rank}, Pal data ${palByName.get(name).breeding.rank}`
    );
}

// "Same-Species Breeding": Pals that can only be bred from two of their own species
const sameOnly = rows(section('Same-Species Breeding'))
  .map((cells) => id(names(cells[1] ?? '')[0] ?? ''))
  .filter(Boolean);

// Subspecies and one other Pal with fixed parents: child | parent + parent
const special = [];
for (const [, child, parents] of rows(section('Subspecies Breeding'))) {
  const [a, b] = names(parents ?? '');
  const ids = [id(names(child ?? '')[0] ?? ''), a && id(a), b && id(b)];
  if (ids.every(Boolean)) special.push([ids[1], ids[2], ids[0]]);
}
for (const [child, parents] of rows(section('Miscellaneous'))) {
  const [a, b] = names(parents ?? '');
  const ids = [id(names(child ?? '')[0] ?? ''), a && id(a), b && id(b)];
  if (ids.every(Boolean)) special.push([ids[1], ids[2], ids[0]]);
}

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
const pairKey = (a, b) => [a, b].sort().join('|');
const seen = new Map();
for (const [a, b, child] of special) {
  const k = pairKey(a, b);
  seen.set(k, [...(seen.get(k) ?? []), [a, b, child]]);
}
const byGender = [];
const fixed = [];
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
