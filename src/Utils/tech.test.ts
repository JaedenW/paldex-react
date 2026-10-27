import { describe, expect, it } from 'vitest';
import { byLevel, totalCost } from './tech';
import type { Tech } from '../types';

const t = (
  name: string,
  level: number,
  cost: number,
  ancient = false
): Tech => ({ id: name, name, level, cost, ...(ancient && { ancient }) });

describe('totalCost', () => {
  it('keeps normal and ancient points apart', () => {
    expect(totalCost([t('a', 1, 2), t('b', 2, 3), t('c', 3, 4, true)])).toEqual(
      { count: 3, points: 5, ancientPoints: 4 }
    );
  });

  it('is zero for nothing', () => {
    expect(totalCost([])).toEqual({ count: 0, points: 0, ancientPoints: 0 });
  });
});

describe('byLevel', () => {
  it('groups by level in ascending order', () => {
    const groups = byLevel([t('c', 5, 1), t('a', 1, 1), t('b', 5, 1)]);
    expect(groups.map((g) => g.level)).toEqual([1, 5]);
    expect(groups[1].techs.map((x) => x.name)).toEqual(['c', 'b']);
  });
});
