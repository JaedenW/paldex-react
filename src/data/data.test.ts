import { describe, expect, it } from 'vitest';
import { items, recipes, sources, techs } from './gear';
import { dataSource, pals } from './index';
import unusedJson from './unused.json';

// These guard the scraped data: what the wiki marks as unused, or that has no
// number in the Paldeck, is not in the game and must not appear in the app.
const unused = new Set(unusedJson as string[]);

describe('scraped data', () => {
  it('knows which game version it covers', () => {
    expect(dataSource.gameVersion).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('leaves out content the wiki marks as unused', () => {
    expect(unused.size).toBeGreaterThan(50);
    expect(items.filter((i) => unused.has(i.name))).toEqual([]);
    expect(
      recipes.filter(
        (r) =>
          unused.has(r.product) || r.ingredients.some((i) => unused.has(i.name))
      )
    ).toEqual([]);
    expect(
      techs.filter((t) => (t.unlocks ?? []).some((u) => unused.has(u.name)))
    ).toEqual([]);
    expect(Object.keys(sources).filter((n) => unused.has(n))).toEqual([]);
    expect(
      pals.filter((p) =>
        [...p.drops, ...p.alphaDrops].some((d) => unused.has(d.item))
      )
    ).toEqual([]);
  });

  it('only has Pals with a Paldeck number', () => {
    expect(pals.every((p) => p.number)).toBe(true);
  });

  it('has recipes whose ingredients and quantities make sense', () => {
    for (const r of recipes) {
      expect(r.ingredients.length).toBeGreaterThan(0);
      for (const i of r.ingredients) expect(i.qty).toBeGreaterThan(0);
    }
  });

  it('has unique ids for items, techs and Pals', () => {
    const unique = (ids: string[]) => new Set(ids).size === ids.length;
    expect(unique(items.map((i) => i.id))).toBe(true);
    expect(unique(techs.map((t) => t.id))).toBe(true);
    expect(unique(pals.map((p) => p.id))).toBe(true);
  });
});
