import type { Recipe } from '../types';

/** One way to make something. Benches that take the same ingredients are merged. */
export interface RecipeVariant {
  recipe: Recipe;
  /** Every bench that can make it from these ingredients */
  stations: string[];
}

export interface CraftStep {
  product: string;
  recipe: Recipe;
  /** Benches that can run this step; any of them works */
  stations: string[];
  /** Times the recipe is run */
  batches: number;
  /** Units made, which can exceed what's needed when the recipe makes several */
  made: number;
  /** Units the plan needs */
  needed: number;
  /** Ways to make it, and which one the plan used */
  variants: RecipeVariant[];
  variantIndex: number;
}

export interface CraftPlan {
  /** Craft in this order: ingredients before the things that use them */
  steps: CraftStep[];
  /** Everything that has to be gathered or bought */
  raw: { name: string; qty: number }[];
  /** The benches needed, one entry per step, each listing the benches that would do */
  stations: string[][];
}

/**
 * Benches whose recipes turn one resource into another (Wood into Fiber, Stone
 * into Paldium Fragment, Pal Souls between sizes). Nobody crafts toward these,
 * since the resources are gathered, so the planner leaves them out.
 */
const CONVERSION_STATIONS = new Set(['Crusher']);

const signature = (r: Recipe) =>
  `${r.qty}|${r.quality ?? ''}|${r.schematic ?? ''}|${r.ingredients.map((i) => `${i.name}:${i.qty}`).join(',')}`;

/** Merges recipes with the same ingredients (the same item made at two benches) */
export function groupRecipes(recipes: Recipe[]): RecipeVariant[] {
  const groups = new Map<string, RecipeVariant>();
  for (const recipe of recipes) {
    const key = signature(recipe);
    const group = groups.get(key);
    if (!group)
      groups.set(key, {
        recipe,
        stations: recipe.station ? [recipe.station] : [],
      });
    else if (recipe.station && !group.stations.includes(recipe.station))
      group.stations.push(recipe.station);
  }
  return [...groups.values()];
}

/**
 * The ways to craft something toward a plan: base quality (upgrades need
 * schematics) and no resource conversions, with identical recipes merged.
 */
export function recipeVariants(recipes: Recipe[]): RecipeVariant[] {
  const usable = recipes.filter(
    (r) =>
      r.ingredients.length > 0 &&
      !(r.station && CONVERSION_STATIONS.has(r.station))
  );
  const base = usable.filter((r) => !r.quality);
  return groupRecipes(base.length > 0 ? base : usable);
}

/**
 * Expands an item into the crafts and raw materials needed to make `qty` of
 * it. Anything with no usable recipe counts as raw. With `expand` off, only the
 * target is crafted and its ingredients are listed as they are. `choose` picks
 * which way to make something when there are several (default: the first).
 */
export function planCrafting(
  target: string,
  qty: number,
  opts: {
    recipesOf: (name: string) => Recipe[];
    choose?: (name: string, variants: RecipeVariant[]) => number;
    expand?: boolean;
  }
): CraftPlan {
  const { recipesOf, expand = true } = opts;
  const choose = opts.choose ?? (() => 0);

  const chosen = new Map<
    string,
    { variants: RecipeVariant[]; index: number }
  >();
  const pickFor = (name: string, depth: number) => {
    if (depth > 0 && !expand) return undefined;
    const variants = recipeVariants(recipesOf(name));
    if (variants.length === 0) return undefined;
    const index = Math.min(
      Math.max(choose(name, variants), 0),
      variants.length - 1
    );
    return { variants, index };
  };

  // Depth-first walk to order products so every one comes after what needs it
  const order: string[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (name: string, depth: number) => {
    if (state.has(name)) return; // already ordered, or a cycle we refuse to follow
    state.set(name, 'visiting');
    const pick = pickFor(name, depth);
    if (pick) {
      chosen.set(name, pick);
      for (const ing of pick.variants[pick.index].recipe.ingredients)
        visit(ing.name, depth + 1);
    }
    state.set(name, 'done');
    order.push(name);
  };
  visit(target, 0);
  order.reverse();

  const demand = new Map<string, number>([[target, qty]]);
  const steps: CraftStep[] = [];
  const raw = new Map<string, number>();
  for (const name of order) {
    const needed = demand.get(name) ?? 0;
    const pick = chosen.get(name);
    if (!pick) {
      raw.set(name, needed);
      continue;
    }
    const { recipe, stations } = pick.variants[pick.index];
    const batches = Math.ceil(needed / recipe.qty);
    steps.push({
      product: name,
      recipe,
      stations,
      batches,
      made: batches * recipe.qty,
      needed,
      variants: pick.variants,
      variantIndex: pick.index,
    });
    for (const ing of recipe.ingredients)
      demand.set(ing.name, (demand.get(ing.name) ?? 0) + batches * ing.qty);
  }

  // `order` runs from the target down; crafting runs the other way
  steps.reverse();
  const groups = new Map<string, string[]>();
  for (const s of steps)
    if (s.stations.length)
      groups.set([...s.stations].sort().join('|'), [...s.stations].sort());
  return {
    steps,
    raw: [...raw]
      .map(([name, q]) => ({ name, qty: q }))
      .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name)),
    stations: [...groups.values()].sort((a, b) =>
      a.join().localeCompare(b.join())
    ),
  };
}
