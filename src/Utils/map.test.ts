import { describe, expect, it } from 'vitest';
import { boundsOf, formatCoords, hotspots } from './map';

describe('hotspots', () => {
  const spawns = {
    day: [
      [10, 10],
      [20, 30],
      [30, 20],
      [510, 510],
    ] as [number, number][],
    night: [
      [15, 15],
      [520, 505],
    ] as [number, number][],
  };

  it('puts the busiest cell first, at the average of its points', () => {
    const [top] = hotspots(spawns);
    expect(top.count).toBe(4);
    expect(top.x).toBe(19);
    expect(top.y).toBe(19);
    expect(top.day).toBe(3);
    expect(top.night).toBe(1);
  });

  it('keeps separate areas separate and honours the limit', () => {
    expect(hotspots(spawns)).toHaveLength(2);
    expect(hotspots(spawns, 100, 1)).toHaveLength(1);
  });

  it('puts points either side of zero in different cells', () => {
    const result = hotspots(
      {
        day: [
          [-5, 5],
          [5, 5],
        ],
        night: [],
      },
      100
    );
    expect(result).toHaveLength(2);
  });

  it('is empty without spawn points', () => {
    expect(hotspots({ day: [], night: [] })).toEqual([]);
  });
});

describe('boundsOf', () => {
  it('boxes the points', () => {
    expect(
      boundsOf([
        [1, 5],
        [-3, 2],
        [4, -1],
      ])
    ).toEqual({ minX: -3, maxX: 4, minY: -1, maxY: 5 });
  });

  it('is undefined for no points', () => {
    expect(boundsOf([])).toBeUndefined();
  });
});

describe('formatCoords', () => {
  it('rounds to whole numbers', () => {
    expect(formatCoords(-134.4, 94.6)).toBe('-134, 95');
  });
});
