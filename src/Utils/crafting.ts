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

/** What the crafting calculator is working out */
export interface CraftTarget {
  kind: Recipe['kind'];
  id: string;
  name: string;
}

/** A recipe's ingredients in a line, to tell its variants apart */
export const recipeSummary = (r: Recipe) =>
  r.ingredients.map((i) => `${i.qty} ${i.name}`).join(', ');

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

export interface FlowNode {
  /** The item's name; unique within a plan */
  id: string;
  /** Raw materials are gathered or bought; the rest are crafted */
  kind: 'raw' | 'craft';
  /** Units the plan needs of it */
  qty: number;
  /** 0 for raw materials, then 1 more than its deepest ingredient */
  tier: number;
  /** For crafted nodes: the step that makes it */
  step?: CraftStep;
}

export interface FlowEdge {
  from: string;
  to: string;
  /** Units of `from` the `to` step uses in total */
  qty: number;
}

export interface FlowLayout {
  /** Stages from raw materials (first) to the finished item (last), each in drawing order */
  columns: FlowNode[][];
  edges: FlowEdge[];
}

/**
 * Lays a plan out as stages: raw materials, then components in the order they
 * can be made, then the item itself. A node's stage is one past its deepest
 * ingredient, so everything a step needs sits in an earlier stage. Nodes are
 * ordered within each stage to keep connecting lines from crossing much.
 */
export function flowLayout(plan: CraftPlan): FlowLayout {
  const stepBy = new Map(plan.steps.map((s) => [s.product, s]));
  const tiers = new Map<string, number>();
  const tierOf = (name: string): number => {
    const known = tiers.get(name);
    if (known !== undefined) return known;
    const step = stepBy.get(name);
    const tier = step
      ? 1 + Math.max(0, ...step.recipe.ingredients.map((i) => tierOf(i.name)))
      : 0;
    tiers.set(name, tier);
    return tier;
  };

  const nodes: FlowNode[] = [
    ...plan.raw.map((r): FlowNode => ({
      id: r.name,
      kind: 'raw',
      qty: r.qty,
      tier: 0,
    })),
    ...plan.steps.map((s): FlowNode => ({
      id: s.product,
      kind: 'craft',
      qty: s.needed,
      tier: tierOf(s.product),
      step: s,
    })),
  ];
  const edges: FlowEdge[] = plan.steps.flatMap((s) =>
    s.recipe.ingredients.map((i) => ({
      from: i.name,
      to: s.product,
      qty: s.batches * i.qty,
    }))
  );

  const maxTier = Math.max(0, ...nodes.map((n) => n.tier));
  const columns: FlowNode[][] = Array.from({ length: maxTier + 1 }, () => []);
  for (const n of nodes) columns[n.tier].push(n);

  // Order each column by where its neighbours sit (as a 0..1 fraction of their
  // column), sweeping towards the result and then back towards the raw materials.
  const position = new Map<string, number>();
  const place = (col: FlowNode[]) =>
    col.forEach((n, i) =>
      position.set(n.id, col.length > 1 ? i / (col.length - 1) : 0.5)
    );
  columns.forEach(place);
  const barycentre = (id: string, neighbours: string[]) => {
    const ps = neighbours
      .map((n) => position.get(n))
      .filter((p): p is number => p !== undefined);
    return ps.length
      ? ps.reduce((a, b) => a + b, 0) / ps.length
      : (position.get(id) ?? 0.5);
  };
  const inputsOf = (id: string) =>
    edges.filter((e) => e.to === id).map((e) => e.from);
  const outputsOf = (id: string) =>
    edges.filter((e) => e.from === id).map((e) => e.to);
  for (let t = 1; t < columns.length; t++) {
    columns[t].sort(
      (a, b) =>
        barycentre(a.id, inputsOf(a.id)) - barycentre(b.id, inputsOf(b.id))
    );
    place(columns[t]);
  }
  for (let t = columns.length - 2; t >= 0; t--) {
    columns[t].sort(
      (a, b) =>
        barycentre(a.id, outputsOf(a.id)) - barycentre(b.id, outputsOf(b.id))
    );
    place(columns[t]);
  }
  return { columns: columns.filter((c) => c.length > 0), edges };
}
