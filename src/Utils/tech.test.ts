import { describe, expect, it } from 'vitest';
import { byLevel, runningTotals, totalCost, unlockCategory } from './tech';
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

describe('runningTotals', () => {
  it('adds up points level by level, keeping ancient points apart', () => {
    const totals = runningTotals([
      t('a', 1, 2),
      t('b', 1, 3),
      t('c', 2, 4, true),
      t('d', 5, 1),
    ]);
    expect(totals.get(1)).toEqual({ points: 5, ancientPoints: 0 });
    expect(totals.get(2)).toEqual({ points: 5, ancientPoints: 4 });
    expect(totals.get(5)).toEqual({ points: 6, ancientPoints: 4 });
  });

  it('has an entry only for levels that have techs', () => {
    expect([...runningTotals([t('a', 3, 1), t('b', 9, 1)]).keys()]).toEqual([
      3, 9,
    ]);
  });
});

describe('unlockCategory', () => {
  it('names item and building types for players', () => {
    expect(unlockCategory('item', 'Weapon')).toEqual({
      key: 'item:Weapon',
      label: 'Weapons',
    });
    expect(unlockCategory('building', 'Pal')).toEqual({
      key: 'building:Pal',
      label: 'Buildings: Pal facilities',
    });
  });

  it('falls back to the raw type, or Other when there is none', () => {
    expect(unlockCategory('item', 'Mystery').label).toBe('Mystery');
    expect(unlockCategory('building', undefined).key).toBe('building:Other');
    expect(unlockCategory('building', '?').key).toBe('building:Other');
  });
});
