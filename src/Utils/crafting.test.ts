import { describe, expect, it } from 'vitest';
import { defaultRecipe, planCrafting } from './crafting';
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

  it('lists the stations needed', () => {
    expect(planCrafting('Machine', 1, { recipesOf }).stations).toEqual([
      'Bench',
      'Furnace',
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

  it('uses a caller-chosen recipe', () => {
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
      pick: (_, o) => o.find((r) => r.station === 'Fast'),
    });
    expect(plan.raw).toEqual([{ name: 'Wood', qty: 3 }]);
  });
});

describe('defaultRecipe', () => {
  it('prefers the Common recipe over schematic upgrades', () => {
    const base = recipe('Bow', [['Wood', 1]]);
    const rare = recipe('Bow', [['Wood', 2]], {
      quality: 'Rare',
      schematic: 'Bow Schematic 2',
    });
    expect(defaultRecipe([rare, base])).toBe(base);
  });
});
