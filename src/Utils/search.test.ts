import { describe, expect, it } from 'vitest';
import { matchScore, search } from './search';

describe('matchScore', () => {
  it('ranks exact over prefix over word start over substring', () => {
    expect(matchScore('Lamball', 'lamball')).toBeGreaterThan(
      matchScore('Lamball', 'lam')
    );
    expect(matchScore('Lamball', 'lam')).toBeGreaterThan(
      matchScore('Foxparks Cryst', 'cry')
    );
    expect(matchScore('Foxparks Cryst', 'cry')).toBeGreaterThan(
      matchScore('Lamball', 'mba')
    );
    expect(matchScore('Lamball', 'zzz')).toBe(0);
  });

  it('ignores accents and case', () => {
    expect(matchScore('Lamball', 'LAM')).toBe(3);
  });
});

describe('search', () => {
  it('finds a Pal by name and by Paldeck number', () => {
    expect(search('lamball')[0].to).toBe('/pal/lamball');
    expect(search('#001')[0].to).toBe('/pal/lamball');
  });

  it('returns nothing for an empty query', () => {
    expect(search('  ')).toEqual([]);
  });
});
