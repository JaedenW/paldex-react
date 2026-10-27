import type { Tech } from '../types';

export interface CostTotals {
  count: number;
  points: number;
  ancientPoints: number;
}

/** Technology points and ancient technology points for a set of techs */
export function totalCost(techs: Tech[]): CostTotals {
  return techs.reduce(
    (t, x) => ({
      count: t.count + 1,
      points: t.points + (x.ancient ? 0 : x.cost),
      ancientPoints: t.ancientPoints + (x.ancient ? x.cost : 0),
    }),
    { count: 0, points: 0, ancientPoints: 0 }
  );
}

/** Techs grouped by the player level that unlocks them, lowest level first */
export function byLevel(techs: Tech[]): { level: number; techs: Tech[] }[] {
  const map = new Map<number, Tech[]>();
  for (const t of techs) {
    if (!map.has(t.level)) map.set(t.level, []);
    map.get(t.level)!.push(t);
  }
  return [...map]
    .sort((a, b) => a[0] - b[0])
    .map(([level, list]) => ({ level, techs: list }));
}
