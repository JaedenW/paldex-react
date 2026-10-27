import { describe, expect, it } from 'vitest';
import { createLinker } from './linkify';

const link = createLinker([
  { name: 'Lamball', to: '/pal/lamball' },
  { name: 'Lamball Mutton', to: '/item/lamball-mutton' },
  { name: 'Ranch', to: '/building/ranch' },
  { name: 'Ore', to: '/item/ore' },
  { name: 'Wool', to: '/item/wool' },
]);

describe('createLinker', () => {
  it('links names inside a sentence and keeps the rest as text', () => {
    expect(
      link('Possible drop from Lamball when assigned to a Ranch.')
    ).toEqual([
      { text: 'Possible drop from ' },
      { text: 'Lamball', to: '/pal/lamball' },
      { text: ' when assigned to a ' },
      { text: 'Ranch', to: '/building/ranch' },
      { text: '.' },
    ]);
  });

  it('prefers the longer name', () => {
    const segments = link('Eat Lamball Mutton');
    expect(segments.find((s) => s.to)).toEqual({
      text: 'Lamball Mutton',
      to: '/item/lamball-mutton',
    });
  });

  it('only matches whole words, and case-sensitively', () => {
    expect(link('Obtained by mining ore nodes').every((s) => !s.to)).toBe(true);
    expect(link('Oregano grows here').every((s) => !s.to)).toBe(true);
  });

  it('does not link the item to itself', () => {
    expect(link('Drops Wool and Ore', 'Wool').filter((s) => s.to)).toEqual([
      { text: 'Ore', to: '/item/ore' },
    ]);
  });

  it('returns plain text when there is nothing to link', () => {
    expect(link('Nothing here')).toEqual([{ text: 'Nothing here' }]);
  });
});
