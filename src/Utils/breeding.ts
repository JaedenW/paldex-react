import type { Pal } from '../types';

type Combo = [string, string, string];

/**
 * Pals the game never lands on by rank: bosses and legendaries, which the wiki
 * flags as unique-combo Pals and which have the very lowest breeding ranks.
 */
const isRankBreedable = (p: Pal) =>
  !(p.breeding.unique && p.breeding.rank <= 30);

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Breeding rules: a listed unique combination wins; otherwise the child is the
 * Pal whose breeding rank is closest to the parents' average, with ties broken
 * by the lower duplicate priority.
 */
export function createBreeder(pals: Pal[], combos: Combo[]) {
  const byId = new Map(pals.map((p) => [p.id, p]));
  const unique = new Map(combos.map(([x, y, child]) => [pairKey(x, y), child]));
  const pool = pals.filter(isRankBreedable);

  function breed(a: Pal, b: Pal): Pal {
    const listed = byId.get(unique.get(pairKey(a.id, b.id)) ?? '');
    if (listed) return listed;
    if (a.id === b.id) return a;

    const target = Math.floor((a.breeding.rank + b.breeding.rank + 1) / 2);
    let best = pool[0];
    let bestDiff = Infinity;
    for (const p of pool) {
      const diff = Math.abs(p.breeding.rank - target);
      if (
        diff < bestDiff ||
        (diff === bestDiff &&
          (p.breeding.priority ?? Infinity) <
            (best.breeding.priority ?? Infinity))
      ) {
        best = p;
        bestDiff = diff;
      }
    }
    return best;
  }

  /** Every pair of parents that produce this Pal, listed combinations first */
  function parentsOf(child: Pal): [Pal, Pal][] {
    const pairs: [Pal, Pal][] = [];
    const seen = new Set<string>();
    const add = (x: Pal, y: Pal) => {
      const key = pairKey(x.id, y.id);
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push([x, y]);
      }
    };
    for (const [x, y, c] of combos) {
      const px = byId.get(x),
        py = byId.get(y);
      if (c === child.id && px && py) add(px, py);
    }
    // a child's rank only matches a narrow band of parent averages
    for (let i = 0; i < pals.length; i++) {
      for (let j = i; j < pals.length; j++) {
        if (breed(pals[i], pals[j]).id === child.id) add(pals[i], pals[j]);
      }
    }
    return pairs;
  }

  return { breed, parentsOf };
}
