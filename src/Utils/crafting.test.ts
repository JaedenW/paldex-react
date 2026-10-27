import { describe, expect, it } from 'vitest';
import {
  flowLayout,
  groupRecipes,
  planCrafting,
  recipeVariants,
} from './crafting';
import type { Recipe } from '../types';

const recipe = (
  product: string,
  ingredients: [string, number][],
  extra: Partial<Recipe> = {}
): Recipe => ({
  product,
  kind: 'item',
  qty: 1,
  ingredients: ingredients.map(([name, qty]) => ({ name, qty })),
  ...extra,
});

const book = new Map<string, Recipe[]>(
  [
    recipe('Ingot', [['Ore', 2]], { station: 'Furnace' }),
    recipe(
      'Gear',
      [
        ['Ingot', 1],
        ['Wood', 1],
      ],
      { qty: 2, station: 'Bench' }
    ),
    recipe(
      'Machine',
      [
        ['Gear', 3],
        ['Ingot', 2],
      ],
      { station: 'Bench' }
    ),
  ].map((r) => [r.product, [r]])
);
const recipesOf = (name: string) => book.get(name) ?? [];

describe('planCrafting', () => {
  it('rolls ingredients up into raw materials across every level', () => {
    const plan = planCrafting('Machine', 1, { recipesOf });
    // 3 Gear -> 2 batches (makes 4) -> 2 Ingot + 2 Wood; plus 2 Ingot directly
    // 4 Ingot -> 8 Ore
    expect(Object.fromEntries(plan.raw.map((r) => [r.name, r.qty]))).toEqual({
      Ore: 8,
      Wood: 2,
    });
  });

  it('batches by what each recipe makes and counts surplus', () => {
    const gear = planCrafting('Machine', 1, { recipesOf }).steps.find(
      (s) => s.product === 'Gear'
    )!;
    expect(gear.batches).toBe(2);
    expect(gear.made).toBe(4);
    expect(gear.needed).toBe(3);
  });

  it('orders crafts so ingredients come first', () => {
    const order = planCrafting('Machine', 1, { recipesOf }).steps.map(
      (s) => s.product
    );
    expect(order).toEqual(['Ingot', 'Gear', 'Machine']);
  });

  it('lists the benches needed', () => {
    expect(planCrafting('Machine', 1, { recipesOf }).stations).toEqual([
      ['Bench'],
      ['Furnace'],
    ]);
  });

  it('scales with quantity', () => {
    const plan = planCrafting('Ingot', 5, { recipesOf });
    expect(plan.steps[0].batches).toBe(5);
    expect(plan.raw).toEqual([{ name: 'Ore', qty: 10 }]);
  });

  it('can stop at the first level', () => {
    const plan = planCrafting('Machine', 1, { recipesOf, expand: false });
    expect(plan.steps.map((s) => s.product)).toEqual(['Machine']);
    expect(Object.fromEntries(plan.raw.map((r) => [r.name, r.qty]))).toEqual({
      Gear: 3,
      Ingot: 2,
    });
  });

  it('treats an item with no recipe as raw', () => {
    const plan = planCrafting('Ore', 4, { recipesOf });
    expect(plan.steps).toEqual([]);
    expect(plan.raw).toEqual([{ name: 'Ore', qty: 4 }]);
  });

  it('does not loop on circular recipes', () => {
    const loop = new Map([
      ['A', [recipe('A', [['B', 1]])]],
      ['B', [recipe('B', [['A', 1]])]],
    ]);
    const plan = planCrafting('A', 1, { recipesOf: (n) => loop.get(n) ?? [] });
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it('uses the way to make something that the caller chooses', () => {
    const two = new Map([
      [
        'X',
        [
          recipe('X', [['Ore', 1]], { station: 'Slow' }),
          recipe('X', [['Wood', 3]], { station: 'Fast' }),
        ],
      ],
    ]);
    const plan = planCrafting('X', 1, {
      recipesOf: (n) => two.get(n) ?? [],
      choose: () => 1,
    });
    expect(plan.raw).toEqual([{ name: 'Wood', qty: 3 }]);
    expect(plan.steps[0].variants).toHaveLength(2);
    expect(plan.steps[0].variantIndex).toBe(1);
  });

  it('does not craft raw resources out of other resources', () => {
    // a Saddle needs Fiber; the Crusher can turn Wood into Fiber, but Fiber is gathered
    const crushing = new Map([
      [
        'Saddle',
        [
          recipe(
            'Saddle',
            [
              ['Fiber', 25],
              ['Leather', 15],
            ],
            { station: 'Ancient Workbench' }
          ),
        ],
      ],
      ['Fiber', [recipe('Fiber', [['Wood', 1]], { station: 'Crusher' })]],
    ]);
    const plan = planCrafting('Saddle', 1, {
      recipesOf: (n) => crushing.get(n) ?? [],
    });
    expect(Object.fromEntries(plan.raw.map((r) => [r.name, r.qty]))).toEqual({
      Fiber: 25,
      Leather: 15,
    });
    expect(plan.steps.map((s) => s.product)).toEqual(['Saddle']);
  });

  it('does not loop between conversion recipes', () => {
    const souls = new Map([
      [
        'Medium Soul',
        [recipe('Medium Soul', [['Small Soul', 2]], { station: 'Crusher' })],
      ],
      [
        'Small Soul',
        [recipe('Small Soul', [['Medium Soul', 1]], { station: 'Crusher' })],
      ],
    ]);
    const plan = planCrafting('Medium Soul', 1, {
      recipesOf: (n) => souls.get(n) ?? [],
    });
    expect(plan.raw).toEqual([{ name: 'Medium Soul', qty: 1 }]);
  });
});

describe('recipe variants', () => {
  it('merges the same recipe at two benches', () => {
    const same = [
      recipe('Saddle', [['Fiber', 25]], {
        station: 'Ancient Workbench',
        workload: 100,
      }),
      recipe('Saddle', [['Fiber', 25]], {
        station: 'Pal Gear Workbench',
        workload: 100,
      }),
    ];
    const variants = recipeVariants(same);
    expect(variants).toHaveLength(1);
    expect(variants[0].stations).toEqual([
      'Ancient Workbench',
      'Pal Gear Workbench',
    ]);
  });

  it('keeps recipes with different ingredients apart', () => {
    const alt = [
      recipe('Carbon Fiber', [['Charcoal', 5]], { station: 'Line' }),
      recipe('Carbon Fiber', [['Coal', 2]], { station: 'Line' }),
    ];
    expect(recipeVariants(alt)).toHaveLength(2);
  });

  it('prefers the base recipe over schematic upgrades', () => {
    const list = [
      recipe('Bow', [['Wood', 2]], {
        quality: 'Rare',
        schematic: 'Bow Schematic 2',
      }),
      recipe('Bow', [['Wood', 1]]),
    ];
    const variants = recipeVariants(list);
    expect(variants).toHaveLength(1);
    expect(variants[0].recipe.quality).toBeUndefined();
  });

  it('falls back to upgrades when there is no base recipe', () => {
    const list = [recipe('Bow', [['Wood', 2]], { quality: 'Rare' })];
    expect(recipeVariants(list)).toHaveLength(1);
  });

  it('groups without dropping anything when asked to', () => {
    const list = [recipe('Fiber', [['Wood', 1]], { station: 'Crusher' })];
    expect(groupRecipes(list)).toHaveLength(1);
    expect(recipeVariants(list)).toHaveLength(0);
  });
});

describe('flowLayout', () => {
  const layout = flowLayout(planCrafting('Machine', 1, { recipesOf }));
  const stage = (id: string) =>
    layout.columns.findIndex((c) => c.some((n) => n.id === id));

  it('puts raw materials first, the item last, and components between', () => {
    expect(layout.columns.map((c) => c.map((n) => n.id).sort())).toEqual([
      ['Ore', 'Wood'],
      ['Ingot'],
      ['Gear'],
      ['Machine'],
    ]);
  });

  it('places every step after everything it needs', () => {
    for (const e of layout.edges)
      expect(stage(e.from)).toBeLessThan(stage(e.to));
  });

  it('connects each ingredient to the step that uses it, with the total quantity', () => {
    // Gear: 2 batches x 1 Ingot; Machine takes 3 Gear and 2 Ingot; Ingot: 4 batches x 2 Ore
    const edge = (from: string, to: string) =>
      layout.edges.find((e) => e.from === from && e.to === to)?.qty;
    expect(edge('Ingot', 'Gear')).toBe(2);
    expect(edge('Ingot', 'Machine')).toBe(2);
    expect(edge('Gear', 'Machine')).toBe(3);
    expect(edge('Ore', 'Ingot')).toBe(8);
    expect(edge('Wood', 'Gear')).toBe(2);
  });

  it('marks raw and crafted nodes and keeps the step on crafted ones', () => {
    const nodes = layout.columns.flat();
    expect(
      nodes
        .filter((n) => n.kind === 'raw')
        .map((n) => n.id)
        .sort()
    ).toEqual(['Ore', 'Wood']);
    expect(nodes.find((n) => n.id === 'Gear')?.step?.batches).toBe(2);
  });

  it('puts the finished item alone in the last stage', () => {
    expect(layout.columns.at(-1)?.map((n) => n.id)).toEqual(['Machine']);
  });

  it('handles an item with nothing to expand', () => {
    const flat = flowLayout(
      planCrafting('Machine', 1, { recipesOf, expand: false })
    );
    expect(flat.columns.map((c) => c.map((n) => n.id).sort())).toEqual([
      ['Gear', 'Ingot'],
      ['Machine'],
    ]);
  });
});
