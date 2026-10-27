import { describe, expect, it } from 'vitest';
import { defenceChart, multiplier } from './elements';

describe('multiplier', () => {
  it('doubles damage against what an element is strong against', () => {
    expect(multiplier('Fire', ['Grass'])).toBe(2);
    expect(multiplier('Water', ['Fire'])).toBe(2);
  });

  it('halves damage against what resists it and against itself', () => {
    expect(multiplier('Fire', ['Water'])).toBe(0.5);
    expect(multiplier('Fire', ['Fire'])).toBe(0.5);
  });

  it('does not penalise Neutral against Dark or Neutral', () => {
    expect(multiplier('Neutral', ['Dark'])).toBe(1);
    expect(multiplier('Neutral', ['Neutral'])).toBe(1);
  });

  it('cancels a strength and a weakness on a dual-element Pal', () => {
    // Grass is strong against Ground but Fire is strong against Grass
    expect(multiplier('Grass', ['Ground', 'Fire'])).toBe(1);
  });

  it('matches the wiki example for Dragon/Electric', () => {
    const chart = defenceChart(['Dragon', 'Electric']);
    expect(chart.Ice).toBe(2);
    expect(chart.Ground).toBe(2);
    // it resists the elements it is strong against
    expect(chart.Dark).toBe(0.5);
    expect(chart.Water).toBe(0.5);
  });
});
