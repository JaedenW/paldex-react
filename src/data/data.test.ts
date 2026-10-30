import { describe, expect, it } from 'vitest';
import { items, recipes, sources, techs } from './gear';
import { dataSource, obtain, pals } from './index';
import { MARKERS } from './worldmap';
import unusedJson from './unused.json';
import worldmap from './worldmap.json';
import type { MapMarker } from '../Utils/worldmap';

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

describe('world map data', () => {
  const markers = worldmap.markers as MapMarker[];
  const inside = (m: MapMarker) => {
    const b = worldmap.maps[m.map].bounds;
    return m.x >= b.left && m.x <= b.right && m.y >= b.bottom && m.y <= b.top;
  };

  it('has markers for both maps, with unique ids', () => {
    expect(markers.filter((m) => m.map === 'world').length).toBeGreaterThan(
      200
    );
    expect(markers.filter((m) => m.map === 'tree').length).toBeGreaterThan(10);
    expect(new Set(markers.map((m) => m.id)).size).toBe(markers.length);
  });

  it('puts every marker on its own map', () => {
    expect(markers.filter((m) => !inside(m))).toEqual([]);
  });

  it('points Pal markers at Pals that exist', () => {
    const known = new Set(pals.map((p) => p.id));
    expect(markers.filter((m) => m.pal && !known.has(m.pal))).toEqual([]);
  });

  it('only uses layers the page knows about', () => {
    const layers = new Set([
      'statue',
      'tower',
      'alpha',
      'predator',
      'bounty',
      'oilrig',
      'merchant',
    ]);
    expect(markers.filter((m) => !layers.has(m.layer))).toEqual([]);
  });

  it('marks the World Tree placement as an estimate', () => {
    expect(worldmap.maps.tree.approximate).toBe(true);
  });
});

describe('where to find each Pal', () => {
  const markers = MARKERS;
  const byId = new Map(markers.map((m) => [m.id, m]));
  const entries = Object.entries(obtain);

  it('shows bosses where the world map does', () => {
    const wrong = entries.flatMap(([id, e]) =>
      (e.bosses ?? []).filter((b) => {
        if (!b.markerId) return false;
        const m = byId.get(b.markerId);
        return (
          !m || m.pal !== id || m.map !== b.map || m.x !== b.x || m.y !== b.y
        );
      })
    );
    expect(wrong).toEqual([]);
  });

  it('gives every Alpha and predator marker to its Pal', () => {
    const listed = new Set(
      entries.flatMap(([, e]) => (e.bosses ?? []).map((b) => b.markerId))
    );
    const missing = markers.filter(
      (m) =>
        (m.layer === 'alpha' || m.layer === 'predator') && !listed.has(m.id)
    );
    expect(missing).toEqual([]);
  });

  it('gives every placed boss a marker on the map', () => {
    const bad = entries.flatMap(([, e]) =>
      (e.bosses ?? []).filter(
        (b) => b.x !== undefined && !byId.has(b.markerId ?? '')
      )
    );
    expect(bad).toEqual([]);
  });

  it('marks estimated bosses as estimates on both maps', () => {
    const bad = entries.flatMap(([, e]) =>
      (e.bosses ?? []).filter(
        (b) => !!b.approximate !== !!byId.get(b.markerId ?? '')?.approximate
      )
    );
    expect(bad).toEqual([]);
  });

  it('has no placeholder boss coordinates or broken locations', () => {
    const bad = entries.flatMap(([, e]) =>
      (e.bosses ?? []).filter(
        (b) => (b.x === 0 && b.y === 0) || b.location.startsWith('|')
      )
    );
    expect(bad).toEqual([]);
  });

  it('names real World Tree regions', () => {
    const bad = entries.flatMap(([, e]) =>
      (e.tree?.places ?? []).filter((id) => byId.get(id)?.map !== 'tree')
    );
    expect(bad).toEqual([]);
  });

  it('keeps every Pal the wiki puts on the World Tree', () => {
    expect(entries.filter(([, e]) => e.tree).length).toBeGreaterThan(25);
  });
});
