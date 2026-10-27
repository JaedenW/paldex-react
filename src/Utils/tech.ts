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

export interface Category {
  /** Stable id for the URL, such as "item:Weapon" or "building:Production" */
  key: string;
  label: string;
}

const ITEM_LABELS: Record<string, string> = {
  Weapon: 'Weapons',
  Armor: 'Armor',
  Accessory: 'Accessories',
  Ammo: 'Ammo',
  Sphere: 'Pal Spheres',
  'Sphere Module': 'Sphere modules',
  Glider: 'Gliders',
  Implant: 'Implants',
  Consumable: 'Consumables',
  Material: 'Materials',
  'Key Item': 'Saddles & key items',
  'Other Item': 'Other items',
};

const BUILDING_LABELS: Record<string, string> = {
  Foundation: 'Foundations & structures',
  Furniture: 'Furniture & decor',
  Production: 'Production',
  Storage: 'Storage',
  Pal: 'Pal facilities',
  Infrastructure: 'Infrastructure',
  Defense: 'Defense',
  Lighting: 'Lighting',
  Food: 'Cooking',
  'Other Structures': 'Other structures',
};

/** What a thing a tech unlocks counts as, for filtering by "unlocks…" */
export function unlockCategory(
  kind: 'item' | 'building',
  type?: string
): Category {
  const t = type && type !== '?' ? type : 'Other';
  return kind === 'item'
    ? { key: `item:${t}`, label: ITEM_LABELS[t] ?? t }
    : { key: `building:${t}`, label: `Buildings: ${BUILDING_LABELS[t] ?? t}` };
}

/** Points needed to unlock every tech up to and including each level */
export function runningTotals(
  techs: Tech[]
): Map<number, { points: number; ancientPoints: number }> {
  const out = new Map<number, { points: number; ancientPoints: number }>();
  let points = 0;
  let ancientPoints = 0;
  for (const { level, techs: list } of byLevel(techs)) {
    const cost = totalCost(list);
    points += cost.points;
    ancientPoints += cost.ancientPoints;
    out.set(level, { points, ancientPoints });
  }
  return out;
}
