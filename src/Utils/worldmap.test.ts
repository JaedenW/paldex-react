import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYERS,
  clampView,
  fitPoints,
  fitSpan,
  fitView,
  formatAt,
  formatLayers,
  nearestMarker,
  parseAt,
  parseLayers,
  toScreen,
  toWorld,
  zoomAround,
} from './worldmap';

const bounds = { left: -1000, top: 500, right: 1000, bottom: -500 };
const size = { w: 800, h: 600 };

describe('toScreen and toWorld', () => {
  it('put the view centre in the middle of the screen', () => {
    expect(toScreen({ cx: 10, cy: 20, span: 400 }, size, 10, 20)).toEqual([
      400, 300,
    ]);
  });

  it('have north at the top and east at the right', () => {
    const view = { cx: 0, cy: 0, span: 800 }; // 1 px per unit
    expect(toScreen(view, size, 100, 0)[0]).toBe(500);
    expect(toScreen(view, size, 0, 100)[1]).toBe(200);
  });

  it('round-trip', () => {
    const view = { cx: -300, cy: 120, span: 650 };
    const [sx, sy] = toScreen(view, size, 55, -80);
    const [x, y] = toWorld(view, size, sx, sy);
    expect(x).toBeCloseTo(55);
    expect(y).toBeCloseTo(-80);
  });
});

describe('fitting', () => {
  it('shows the whole map, limited by whichever side is tighter', () => {
    // a square screen: the map is 2000 wide and 1000 tall, so width limits
    expect(fitSpan(bounds, { w: 1000, h: 1000 }, 0)).toBe(2000);
    // a very wide, short screen: 1000 units of height must fit in 500px, so 4000 units across 2000px
    expect(fitSpan(bounds, { w: 2000, h: 500 }, 0)).toBe(4000);
  });

  it('centres on the map', () => {
    expect(fitView(bounds, size)).toMatchObject({ cx: 0, cy: 0 });
  });

  it('frames a set of points with room around them, never closer than minSpan', () => {
    const v = fitPoints(
      [
        [0, 0],
        [100, 50],
      ],
      bounds,
      size,
      60
    );
    expect(v.cx).toBe(50);
    expect(v.cy).toBe(25);
    expect(v.span).toBeGreaterThanOrEqual(130);
    expect(fitPoints([[5, 5]], bounds, size, 60).span).toBe(60);
  });

  it('shows the whole map when there are no points', () => {
    expect(fitPoints([], bounds, size, 60)).toEqual(fitView(bounds, size));
  });
});

describe('clampView and zoomAround', () => {
  it('keeps the centre on the map and the zoom in range', () => {
    const v = clampView({ cx: 5000, cy: -9000, span: 1 }, bounds, size, 50);
    expect(v).toEqual({ cx: 1000, cy: -500, span: 50 });
    expect(clampView({ cx: 0, cy: 0, span: 1e9 }, bounds, size, 50).span).toBe(
      fitSpan(bounds, size, 0.2)
    );
  });

  it('keeps the point under the cursor fixed while zooming', () => {
    const view = { cx: 0, cy: 0, span: 1000 };
    const before = toWorld(view, size, 600, 150);
    const zoomed = zoomAround(view, size, 0.5, 600, 150, bounds, 50);
    const after = toWorld(zoomed, size, 600, 150);
    expect(zoomed.span).toBe(500);
    expect(after[0]).toBeCloseTo(before[0]);
    expect(after[1]).toBeCloseTo(before[1]);
  });

  it('does not zoom past the limits', () => {
    expect(
      zoomAround({ cx: 0, cy: 0, span: 60 }, size, 0.1, 400, 300, bounds, 50)
        .span
    ).toBe(50);
  });
});

describe('nearestMarker', () => {
  const view = { cx: 0, cy: 0, span: 800 };
  const markers = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 30, y: 0 },
  ];

  it('finds the closest within the radius', () => {
    expect(nearestMarker(markers, view, size, 428, 300, 20)?.id).toBe('b');
    expect(nearestMarker(markers, view, size, 405, 300, 20)?.id).toBe('a');
  });

  it('finds nothing when none is close enough', () => {
    expect(nearestMarker(markers, view, size, 100, 100, 20)).toBeUndefined();
  });
});

describe('address helpers', () => {
  it('round-trips a view', () => {
    expect(parseAt(formatAt({ cx: -123.4, cy: 56.6, span: 800.2 }))).toEqual({
      cx: -123,
      cy: 57,
      span: 800,
    });
  });

  it('rejects a malformed or empty view', () => {
    expect(parseAt('nope')).toBeUndefined();
    expect(parseAt('1,2,0')).toBeUndefined();
    expect(parseAt(null)).toBeUndefined();
  });

  it('uses the default layers when none are named', () => {
    expect(parseLayers(null)).toEqual(DEFAULT_LAYERS);
    expect(formatLayers(new Set(DEFAULT_LAYERS))).toBeUndefined();
  });

  it('keeps a chosen set, ignoring unknown names, and can mean none', () => {
    expect([...parseLayers('alpha,nonsense,tower')].sort()).toEqual([
      'alpha',
      'tower',
    ]);
    expect(parseLayers('-').size).toBe(0);
    expect(formatLayers(new Set())).toBe('-');
    expect(formatLayers(new Set(['bounty' as const, 'statue' as const]))).toBe(
      'statue,bounty'
    );
  });
});
