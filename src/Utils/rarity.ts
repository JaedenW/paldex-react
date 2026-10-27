import type { Rarity } from '../types';

export const RARITIES: Rarity[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
];

export const rarityColours: Record<Rarity, string> = {
  Common: '#8a8f98',
  Uncommon: '#3f9d4b',
  Rare: '#2f7fd1',
  Epic: '#8b4fd3',
  Legendary: '#e08a0b',
};

export const rarityRank = (r?: string) =>
  Math.max(0, RARITIES.indexOf(r as Rarity));
