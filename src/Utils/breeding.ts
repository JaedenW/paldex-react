import type { BreedingRules, Pal } from '../types';

type Combo = [string, string, string];

export type BreedMethod = 'same' | 'listed' | 'gender' | 'rank';

export interface BreedResult {
  child: Pal;
  /**
   * same: two of one species; listed: a fixed pairing; gender: depends on which
   * parent is the mother; rank: nearest breeding rank
   */
  method: BreedMethod;
  /** Only for method "rank": the rank maths behind the result */
  rank?: {
    a: number;
    b: number;
    target: number;
    candidates: { pal: Pal; diff: number }[];
  };
  /** Only for method "gender": each possible child and when it hatches */
  alternatives?: { child: Pal; mother: Pal }[];
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Breeding rules, as the wiki describes them:
 * 1. Two of the same species give that species.
 * 2. A listed pairing (a subspecies, or any fixed combination) wins over rank.
 * 3. Otherwise the child is the eligible species whose breeding rank is closest
 *    to floor((rankA + rankB + 1) / 2). Ties go to the higher priority, which
 *    is the wiki's lower index number.
 * Katress with Wixen is the one pairing that depends on which parent is the mother.
 */
export function createBreeder(
  pals: Pal[],
  combos: Combo[],
  rules: BreedingRules
) {
  const byId = new Map(pals.map((p) => [p.id, p]));
  const listed = new Map<string, string>();
  for (const [x, y, child] of combos) listed.set(pairKey(x, y), child);
  for (const [x, y, child] of rules.special) listed.set(pairKey(x, y), child);

  const genderPairs = new Map<string, Combo[]>();
  for (const row of rules.byGender) {
    const k = pairKey(row[0], row[1]);
    genderPairs.set(k, [...(genderPairs.get(k) ?? []), row]);
  }

  // The wiki's rank table stops at around Paldeck #138; for Pals after that,
  // subspecies and own-species-only Pals are out and everything else is in.
  const fixedChildren = new Set(
    [...rules.special, ...rules.byGender].map((r) => r[2])
  );
  const sameOnly = new Set(rules.sameOnly);
  const isEligible = (p: Pal) =>
    rules.pool[p.id] ?? !(fixedChildren.has(p.id) || sameOnly.has(p.id));
  const pool = pals.filter(isEligible);
  const priority = (p: Pal) => p.breeding.priority ?? -Infinity;

  /** Eligible Pals nearest a rank, closest first */
  function nearest(target: number, count: number) {
    return pool
      .map((pal) => ({ pal, diff: Math.abs(pal.breeding.rank - target) }))
      .sort((a, b) => a.diff - b.diff || priority(b.pal) - priority(a.pal))
      .slice(0, count);
  }

  /** The single closest eligible Pal to a rank, found without sorting the pool */
  function closest(target: number): Pal {
    let best = pool[0];
    let bestDiff = Infinity;
    for (const p of pool) {
      const diff = Math.abs(p.breeding.rank - target);
      if (
        diff < bestDiff ||
        (diff === bestDiff && priority(p) > priority(best))
      ) {
        best = p;
        bestDiff = diff;
      }
    }
    return best;
  }

  const rankTarget = (a: Pal, b: Pal) =>
    Math.floor((a.breeding.rank + b.breeding.rank + 1) / 2);

  /** Child and method only; cheap enough to run for every pair of Pals */
  function resolve(a: Pal, b: Pal): { child: Pal; method: BreedMethod } {
    if (a.id === b.id) return { child: a, method: 'same' };
    const mothers = genderPairs.get(pairKey(a.id, b.id));
    if (mothers) return { child: byId.get(mothers[0][2])!, method: 'gender' };
    const fixed = byId.get(listed.get(pairKey(a.id, b.id)) ?? '');
    if (fixed) return { child: fixed, method: 'listed' };
    return { child: closest(rankTarget(a, b)), method: 'rank' };
  }

  /** The child and how it was worked out, for showing the reasoning */
  function explain(a: Pal, b: Pal): BreedResult {
    const { child, method } = resolve(a, b);
    if (method === 'gender') {
      const alternatives = genderPairs
        .get(pairKey(a.id, b.id))!
        .map(([mother, , c]) => ({
          child: byId.get(c)!,
          mother: byId.get(mother)!,
        }));
      return { child, method, alternatives };
    }
    if (method === 'rank') {
      const target = rankTarget(a, b);
      return {
        child,
        method,
        rank: {
          a: a.breeding.rank,
          b: b.breeding.rank,
          target,
          candidates: nearest(target, 5),
        },
      };
    }
    return { child, method };
  }

  const breed = (a: Pal, b: Pal) => resolve(a, b).child;

  /** Every pair of parents that produce this Pal, listed pairings first */
  function parentsOf(child: Pal): { a: Pal; b: Pal; method: BreedMethod }[] {
    const pairs: { a: Pal; b: Pal; method: BreedMethod }[] = [];
    const seen = new Set<string>();
    const add = (a: Pal, b: Pal, method: BreedMethod) => {
      const key = pairKey(a.id, b.id);
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ a, b, method });
      }
    };
    for (const [x, y, c] of [...combos, ...rules.special]) {
      const a = byId.get(x),
        b = byId.get(y);
      if (c === child.id && a && b)
        add(a, b, a.id === b.id ? 'same' : 'listed');
    }
    for (const [x, y, c] of rules.byGender) {
      const a = byId.get(x),
        b = byId.get(y);
      if (c === child.id && a && b) add(a, b, 'gender');
    }
    if (!isEligible(child)) return pairs; // never the result of a rank lookup
    // A rank lookup only reaches this child from a narrow band of parent averages
    for (let i = 0; i < pals.length; i++) {
      for (let j = i; j < pals.length; j++) {
        if (i !== j || pals[i].id === pals[j].id) {
          const r = explain(pals[i], pals[j]);
          if (r.child.id === child.id && r.method === 'rank')
            add(pals[i], pals[j], 'rank');
        }
      }
    }
    return pairs;
  }

  return { breed, explain, parentsOf, isEligible, pool };
}
