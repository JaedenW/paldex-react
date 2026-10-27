import { describe, expect, it } from 'vitest';
import { createBreeder } from './breeding';
import type { Pal } from '../types';

const pal = (id: string, rank: number, priority = 1, unique = false): Pal =>
  ({
    id,
    name: id,
    number: id,
    breeding: { rank, priority, unique, egg: '', maleProbability: 50 },
  }) as Pal;

const a = pal('a', 100),
  b = pal('b', 200),
  mid = pal('mid', 150),
  far = pal('far', 900);
const legend = pal('legend', 1, 1, true);
const pool = [a, b, mid, far, legend];

describe('createBreeder', () => {
  const { breed, parentsOf } = createBreeder(pool, [['a', 'far', 'b']]);

  it('picks the Pal nearest the average rank', () => {
    expect(breed(a, b).id).toBe('mid');
  });

  it('returns the same species for identical parents', () => {
    expect(breed(a, a).id).toBe('a');
  });

  it('uses a listed unique combination in either order', () => {
    expect(breed(a, far).id).toBe('b');
    expect(breed(far, a).id).toBe('b');
  });

  it('never lands on a legendary by rank', () => {
    expect(breed(a, pal('c', 2)).id).not.toBe('legend');
  });

  it('breaks rank ties with the lower priority', () => {
    const x = pal('x', 150, 5),
      y = pal('y', 150, 2);
    const { breed: tie } = createBreeder([a, b, x, y], []);
    expect(tie(a, b).id).toBe('y');
  });

  it('lists parents including unique pairs', () => {
    const ids = parentsOf(b).map(([p, q]) => [p.id, q.id].sort().join('+'));
    expect(ids).toContain('a+far');
  });
});
