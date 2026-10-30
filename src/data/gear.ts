import type { Building, Item, ItemSources, Recipe, Tech } from '../types';
import { pals } from './index';
import { rarityRank } from '../Utils/rarity';
import itemsJson from './gear/items.json';
import buildingsJson from './gear/buildings.json';
import recipesJson from './gear/recipes.json';
import techJson from './gear/tech.json';
import sourcesJson from './gear/sources.json';

// Everything about items, buildings, recipes and technology lives here so the
// pages that need it load it, and the Paldex pages don't.

export const items = itemsJson as unknown as Item[];
export const buildings = buildingsJson as unknown as Building[];
export const recipes = recipesJson as unknown as Recipe[];
export const techs = techJson as unknown as Tech[];
export const sources = sourcesJson as unknown as Record<string, ItemSources>;

export const itemById = new Map(items.map((i) => [i.id, i]));
export const itemByName = new Map(items.map((i) => [i.name, i]));
export const buildingById = new Map(buildings.map((b) => [b.id, b]));
export const buildingByName = new Map(buildings.map((b) => [b.name, b]));
export const techByName = new Map(techs.map((t) => [t.name, t]));

function groupBy<T>(rows: T[], key: (row: T) => string | undefined) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    if (k === undefined) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(row);
  }
  return map;
}

/** Recipes by what they make; buildings and items share a namespace per kind */
const recipesByProduct = groupBy(recipes, (r) => `${r.kind}:${r.product}`);
// base recipe first, then each upgrade in order
for (const list of recipesByProduct.values()) {
  list.sort(
    (a, b) =>
      rarityRank(a.quality) - rarityRank(b.quality) ||
      (a.station ?? '').localeCompare(b.station ?? '')
  );
}
/** Recipes by the workbench or machine that crafts them */
export const recipesByStation = groupBy(recipes, (r) => r.station);
/** Recipes that use an item as an ingredient */
export const recipesUsing = new Map<string, Recipe[]>();
for (const r of recipes) {
  for (const { name } of r.ingredients) {
    if (!recipesUsing.has(name)) recipesUsing.set(name, []);
    recipesUsing.get(name)!.push(r);
  }
}

export const recipesFor = (name: string, kind: Recipe['kind'] = 'item') =>
  recipesByProduct.get(`${kind}:${name}`) ?? [];

/** Pals that drop each item, from the Pal data */
export const palDrops = new Map<
  string,
  {
    palId: string;
    palName: string;
    alpha: boolean;
    chance: number | null;
    min: number | null;
    max: number | null;
  }[]
>();
for (const p of pals) {
  for (const [drops, alpha] of [
    [p.drops, false],
    [p.alphaDrops, true],
  ] as const) {
    for (const d of drops) {
      if (!palDrops.has(d.item)) palDrops.set(d.item, []);
      palDrops.get(d.item)!.push({
        palId: p.id,
        palName: p.name,
        alpha,
        chance: d.chance,
        min: d.min,
        max: d.max,
      });
    }
  }
}

export const itemIcon = (i: Item) => `/items/${i.id}.webp`;
export const buildingIcon = (b: Building) => `/buildings/${b.id}.webp`;
