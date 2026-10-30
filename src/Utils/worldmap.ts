// Map maths and data for the home page's world map. Positions are the in-game
// map's X, Y; a view is the point at the centre of the screen and how many map
// units fit across it. Everything here is plain functions so it can be tested.

import { boundsOf } from './map';

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The centre of the screen, and how many map units fit across its width */
export interface View {
  cx: number;
  cy: number;
  span: number;
}

export interface Size {
  w: number;
  h: number;
}

export type LayerId =
  'statue' | 'tower' | 'alpha' | 'predator' | 'bounty' | 'oilrig' | 'merchant';
export type MapId = 'world' | 'tree';

export interface MapMarker {
  id: string;
  layer: LayerId;
  map: MapId;
  name: string;
  x: number;
  y: number;
  /** Pal id, for Alpha and predator markers */
  pal?: string;
  region?: string;
  level?: number;
  hardLevel?: number;
  boss?: string;
  note?: string;
}

export interface LayerDef {
  id: LayerId;
  label: string;
  /** What it marks, for the panel */
  description: string;
  colour: string;
  /** A character drawn in the marker when there is no Pal picture */
  glyph: string;
  /** On when the map first opens */
  defaultOn: boolean;
}

export const LAYERS: LayerDef[] = [
  {
    id: 'statue',
    label: 'Fast travel statues',
    description: 'Great Eagle Statues you can teleport between',
    colour: '#22d3ee',
    glyph: '◆',
    defaultOn: true,
  },
  {
    id: 'tower',
    label: 'Towers',
    description: 'Boss towers, with their level',
    colour: '#a78bfa',
    glyph: 'T',
    defaultOn: true,
  },
  {
    id: 'alpha',
    label: 'Alpha bosses',
    description: 'Roaming Alpha Pals, with their level',
    colour: '#ef4444',
    glyph: 'A',
    defaultOn: true,
  },
  {
    id: 'predator',
    label: 'Predator Pals',
    description: 'Fixed spawns of Predator Pals',
    colour: '#d946ef',
    glyph: 'P',
    defaultOn: false,
  },
  {
    id: 'bounty',
    label: 'Bounty targets',
    description: 'Wanted criminals to hunt',
    colour: '#f59e0b',
    glyph: '!',
    defaultOn: false,
  },
  {
    id: 'oilrig',
    label: 'Oil rigs',
    description: 'Rayne Syndicate oil rigs',
    colour: '#94a3b8',
    glyph: 'R',
    defaultOn: false,
  },
  {
    id: 'merchant',
    label: 'Wandering merchants',
    description: 'Merchants at known stops',
    colour: '#4ade80',
    glyph: '$',
    defaultOn: false,
  },
];

export const layerById = new Map(LAYERS.map((l) => [l.id, l]));
export const DEFAULT_LAYERS = new Set<LayerId>(
  LAYERS.filter((l) => l.defaultOn).map((l) => l.id)
);

/** The map units each screen pixel covers is span / width; this is its inverse */
export const pxPerUnit = (view: View, size: Size) => size.w / view.span;

export function toScreen(
  view: View,
  size: Size,
  x: number,
  y: number
): [number, number] {
  const s = pxPerUnit(view, size);
  return [(x - view.cx) * s + size.w / 2, (view.cy - y) * s + size.h / 2];
}

export function toWorld(
  view: View,
  size: Size,
  sx: number,
  sy: number
): [number, number] {
  const s = pxPerUnit(view, size);
  return [view.cx + (sx - size.w / 2) / s, view.cy - (sy - size.h / 2) / s];
}

const mapWidth = (b: Bounds) => b.right - b.left;
const mapHeight = (b: Bounds) => b.top - b.bottom;

/** The span at which the whole map is visible */
export function fitSpan(bounds: Bounds, size: Size, pad = 0.04) {
  const byWidth = mapWidth(bounds);
  const byHeight = mapHeight(bounds) * (size.w / Math.max(1, size.h));
  return Math.max(byWidth, byHeight) * (1 + pad * 2);
}

export function fitView(bounds: Bounds, size: Size): View {
  return {
    cx: (bounds.left + bounds.right) / 2,
    cy: (bounds.top + bounds.bottom) / 2,
    span: fitSpan(bounds, size),
  };
}

/** A view showing every one of these points, with room around them */
export function fitPoints(
  points: [number, number][],
  bounds: Bounds,
  size: Size,
  minSpan: number
): View {
  const box = boundsOf(points);
  if (!box) return fitView(bounds, size);
  const span = Math.max(
    (box.maxX - box.minX) * 1.3,
    (box.maxY - box.minY) * 1.3 * (size.w / Math.max(1, size.h)),
    minSpan
  );
  return clampView(
    { cx: (box.maxX + box.minX) / 2, cy: (box.maxY + box.minY) / 2, span },
    bounds,
    size,
    minSpan
  );
}

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** Keeps the view on the map: zoomed in no further than minSpan, out no further than a bit past the whole map */
export function clampView(
  view: View,
  bounds: Bounds,
  size: Size,
  minSpan: number
): View {
  const span = clamp(view.span, minSpan, fitSpan(bounds, size, 0.2));
  return {
    span,
    cx: clamp(view.cx, bounds.left, bounds.right),
    cy: clamp(view.cy, bounds.bottom, bounds.top),
  };
}

/** Zooms by `factor` (below 1 zooms in) keeping the point under (sx, sy) where it is */
export function zoomAround(
  view: View,
  size: Size,
  factor: number,
  sx: number,
  sy: number,
  bounds: Bounds,
  minSpan: number
): View {
  const [wx, wy] = toWorld(view, size, sx, sy);
  const span = clamp(view.span * factor, minSpan, fitSpan(bounds, size, 0.2));
  const s = size.w / span;
  return clampView(
    { span, cx: wx - (sx - size.w / 2) / s, cy: wy + (sy - size.h / 2) / s },
    bounds,
    size,
    minSpan
  );
}

/** The nearest marker within `radiusPx` of a screen point, if any */
export function nearestMarker<T extends { x: number; y: number }>(
  markers: T[],
  view: View,
  size: Size,
  sx: number,
  sy: number,
  radiusPx: number
): T | undefined {
  let best: T | undefined;
  let bestDist = radiusPx;
  for (const m of markers) {
    const [mx, my] = toScreen(view, size, m.x, m.y);
    const d = Math.hypot(mx - sx, my - sy);
    if (d <= bestDist) {
      best = m;
      bestDist = d;
    }
  }
  return best;
}

/** "x,y,span" in the address, so a view can be shared */
export function formatAt(view: View) {
  return `${Math.round(view.cx)},${Math.round(view.cy)},${Math.round(view.span)}`;
}

export function parseAt(value: string | null | undefined): View | undefined {
  const m = value?.match(
    /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/
  );
  if (!m) return undefined;
  const span = Number(m[3]);
  return span > 0 ? { cx: Number(m[1]), cy: Number(m[2]), span } : undefined;
}

/** Layers named in the address (`layers=alpha,tower`); an unknown name is ignored, and none means the defaults */
export function parseLayers(value: string | null | undefined): Set<LayerId> {
  if (value === null || value === undefined) return new Set(DEFAULT_LAYERS);
  const ids = value
    .split(',')
    .filter((id): id is LayerId => layerById.has(id as LayerId));
  return new Set(ids);
}

export function formatLayers(layers: Set<LayerId>): string | undefined {
  const same =
    layers.size === DEFAULT_LAYERS.size &&
    [...layers].every((l) => DEFAULT_LAYERS.has(l));
  if (same) return undefined;
  return layers.size === 0
    ? '-'
    : LAYERS.filter((l) => layers.has(l.id))
        .map((l) => l.id)
        .join(',');
}

/** The colours given to Pals whose spawns are shown together */
export const SPAWN_COLOURS = ['#fb923c', '#38bdf8', '#a3e635', '#f472b6'];
export const MAX_SPAWN_PALS = SPAWN_COLOURS.length;
