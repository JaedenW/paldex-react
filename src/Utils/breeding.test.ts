import { describe, expect, it } from 'vitest';
import { createBreeder } from './breeding';
import type { BreedingRules, Pal } from '../types';

const pal = (id: string, rank: number, priority = 1): Pal =>
  ({
    id,
    name: id,
    number: id,
    breeding: { rank, priority, unique: false, egg: '', maleProbability: 50 },
  }) as Pal;

const a = pal('a', 100),
  b = pal('b', 200),
  mid = pal('mid', 150),
  far = pal('far', 900);
const legend = pal('legend', 1);
const sub = pal('sub', 160); // a subspecies: only from a fixed pair
const solo = pal('solo', 155); // only from two of itself
const mother = pal('mother', 500),
  father = pal('father', 520);
const noct = pal('noct', 610),
  ignis = pal('ignis', 620); // the two possible children of mother + father
const pals = [a, b, mid, far, legend, sub, solo, mother, father, noct, ignis];

const rules: BreedingRules = {
  pool: { legend: false },
  sameOnly: ['solo'],
  special: [['a', 'far', 'sub']],
  byGender: [
    ['mother', 'father', 'noct'],
    ['father', 'mother', 'ignis'],
  ],
};
const combos: [string, string, string][] = [['b', 'far', 'mid']];
const { breed, explain, parentsOf, isEligible } = createBreeder(
  pals,
  combos,
  rules
);

describe('breed', () => {
  it('picks the eligible Pal nearest the average rank', () => {
    expect(breed(a, b).id).toBe('mid');
  });

  it('returns the same species for identical parents', () => {
    expect(breed(a, a).id).toBe('a');
    expect(explain(a, a).method).toBe('same');
  });

  it('uses a fixed pairing in either order, over the rank maths', () => {
    expect(breed(a, far).id).toBe('sub');
    expect(breed(far, a).id).toBe('sub');
    expect(explain(a, far).method).toBe('listed');
  });

  it('also uses combinations from the Pal pages', () => {
    expect(breed(b, far).id).toBe('mid');
  });

  it('never lands on an ineligible Pal by rank', () => {
    expect(breed(a, pal('c', 2)).id).not.toBe('legend');
    expect(breed(a, pal('c', 2)).id).not.toBe('sub'); // subspecies and own-species Pals are left out too
    expect(breed(a, pal('c', 2)).id).not.toBe('solo');
  });

  it('breaks rank ties with the higher priority', () => {
    const x = pal('x', 150, 2),
      y = pal('y', 150, 9);
    const { breed: tie } = createBreeder([a, b, x, y], [], {
      pool: {},
      sameOnly: [],
      special: [],
      byGender: [],
    });
    expect(tie(a, b).id).toBe('y');
  });
});

describe('eligibility', () => {
  it('follows the wiki table where it has an entry, and the rule where it does not', () => {
    expect(isEligible(legend)).toBe(false); // the table says no
    expect(isEligible(sub)).toBe(false); // a fixed-pair child
    expect(isEligible(solo)).toBe(false); // own species only
    expect(isEligible(a)).toBe(true);
  });

  it('lets the table override the rule', () => {
    const r = createBreeder(pals, [], { ...rules, pool: { sub: true } });
    expect(r.isEligible(sub)).toBe(true);
  });
});

describe('explain', () => {
  it('shows the rank maths and the nearest candidates', () => {
    const r = explain(a, b);
    expect(r.method).toBe('rank');
    expect(r.rank?.target).toBe(150); // floor((100 + 200 + 1) / 2)
    expect(r.rank?.candidates[0]).toMatchObject({ diff: 0 });
    expect(r.rank?.candidates[0].pal.id).toBe('mid');
    expect(r.rank?.candidates.length).toBeGreaterThan(1);
  });

  it('lists each outcome when the mother decides it', () => {
    const r = explain(mother, father);
    expect(r.method).toBe('gender');
    expect(r.alternatives?.map((x) => [x.mother.id, x.child.id])).toEqual([
      ['mother', 'noct'],
      ['father', 'ignis'],
    ]);
  });
});

describe('parentsOf', () => {
  it('lists fixed pairings with their method', () => {
    const found = parentsOf(sub).map((p) =>
      [p.a.id, p.b.id, p.method].join('+')
    );
    expect(found).toContain('a+far+listed');
  });

  it('finds pairs that reach a Pal by rank', () => {
    const pairs = parentsOf(mid);
    expect(
      pairs.some((p) => p.a.id === 'a' && p.b.id === 'b' && p.method === 'rank')
    ).toBe(true);
    // every pair really does produce it
    for (const p of pairs) expect(breed(p.a, p.b).id).toBe('mid');
  });

  it('finds nothing by rank for an ineligible Pal', () => {
    expect(parentsOf(legend)).toEqual([]);
  });

  it('includes a species bred from itself when that is how it is made', () => {
    const { parentsOf: pf } = createBreeder(
      pals,
      [['solo', 'solo', 'solo']],
      rules
    );
    expect(pf(solo).map((p) => p.method)).toContain('same');
  });
});
