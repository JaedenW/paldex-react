import type { Spawns } from '../types';

export interface Hotspot {
  x: number;
  y: number;
  count: number;
  day: number;
  night: number;
}

/**
 * Groups spawn points into square cells and returns the busiest ones, so a
 * Pal with thousands of points reduces to a few places worth going to. Each
 * hotspot sits at the average position of its points.
 */
export function hotspots(spawns: Spawns, cell = 100, limit = 6): Hotspot[] {
  const cells = new Map<
    string,
    { sx: number; sy: number; count: number; day: number; night: number }
  >();
  const add = (points: [number, number][], key: 'day' | 'night') => {
    for (const [x, y] of points) {
      const k = `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
      const c = cells.get(k) ?? { sx: 0, sy: 0, count: 0, day: 0, night: 0 };
      c.sx += x;
      c.sy += y;
      c.count++;
      c[key]++;
      cells.set(k, c);
    }
  };
  add(spawns.day, 'day');
  add(spawns.night, 'night');

  return [...cells.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((c) => ({
      x: Math.round(c.sx / c.count),
      y: Math.round(c.sy / c.count),
      count: c.count,
      day: c.day,
      night: c.night,
    }));
}

/** Smallest box holding every point, or undefined when there are none */
export function boundsOf(points: [number, number][]) {
  if (points.length === 0) return undefined;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

export const formatCoords = (x: number, y: number) =>
  `${Math.round(x)}, ${Math.round(y)}`;
