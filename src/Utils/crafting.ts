import type { Recipe } from '../types';

export interface CraftStep {
  product: string;
  recipe: Recipe;
  /** Times the recipe is run */
  batches: number;
  /** Units made, which can exceed what's needed when the recipe makes several */
  made: number;
  /** Units the plan needs */
  needed: number;
}

export interface CraftPlan {
  /** Craft in this order: ingredients before the things that use them */
  steps: CraftStep[];
  /** Everything that has to be gathered or bought */
  raw: { name: string; qty: number }[];
  stations: string[];
}

/** The base recipe: Common quality when there is one, since upgrades need schematics */
export function defaultRecipe(options: Recipe[]): Recipe | undefined {
  return options.find((r) => !r.quality) ?? options[0];
}

/**
 * Expands an item into the crafts and raw materials needed to make `qty` of
 * it. Anything with no recipe counts as raw. With `expand` off, only the
 * target is crafted and its ingredients are listed as they are.
 */
export function planCrafting(
  target: string,
  qty: number,
  opts: {
    recipesOf: (name: string) => Recipe[];
    pick?: (name: string, options: Recipe[]) => Recipe | undefined;
    expand?: boolean;
  }
): CraftPlan {
  const { recipesOf, expand = true } = opts;
  const pick =
    opts.pick ?? ((_: string, options: Recipe[]) => defaultRecipe(options));
  const recipeFor = (name: string, depth: number) => {
    if (depth > 0 && !expand) return undefined;
    const options = recipesOf(name).filter((r) => r.ingredients.length > 0);
    return options.length ? pick(name, options) : undefined;
  };

  // Depth-first walk to order products so every one comes after what needs it
  const order: string[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const recipes = new Map<string, Recipe>();
  const visit = (name: string, depth: number) => {
    if (state.has(name)) return; // already ordered, or a cycle we refuse to follow
    state.set(name, 'visiting');
    const recipe = recipeFor(name, depth);
    if (recipe) {
      recipes.set(name, recipe);
      for (const ing of recipe.ingredients) visit(ing.name, depth + 1);
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
    const recipe = recipes.get(name);
    if (!recipe) {
      raw.set(name, needed);
      continue;
    }
    const batches = Math.ceil(needed / recipe.qty);
    steps.push({
      product: name,
      recipe,
      batches,
      made: batches * recipe.qty,
      needed,
    });
    for (const ing of recipe.ingredients)
      demand.set(ing.name, (demand.get(ing.name) ?? 0) + batches * ing.qty);
  }

  // `order` runs from the target down; crafting runs the other way
  steps.reverse();
  return {
    steps,
    raw: [...raw]
      .map(([name, q]) => ({ name, qty: q }))
      .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name)),
    stations: [
      ...new Set(
        steps.map((s) => s.recipe.station).filter((s): s is string => !!s)
      ),
    ].sort(),
  };
}
