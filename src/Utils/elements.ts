import type { Element } from '../types';

export const ELEMENTS: Element[] = [
  'Neutral',
  'Fire',
  'Water',
  'Grass',
  'Electric',
  'Ice',
  'Ground',
  'Dark',
  'Dragon',
];

export const elementColours: Record<Element, string> = {
  Neutral: '#8c8a82',
  Fire: '#e8602c',
  Water: '#3b82d6',
  Grass: '#5fa12a',
  Electric: '#d9a406',
  Ice: '#3fb8cf',
  Ground: '#a1702a',
  Dark: '#6b4f8a',
  Dragon: '#7c4ddb',
};

/** Elements each element hits for double damage (from the Palworld wiki) */
export const STRONG_AGAINST: Record<Element, Element[]> = {
  Neutral: [],
  Fire: ['Grass', 'Ice'],
  Water: ['Fire'],
  Grass: ['Ground'],
  Electric: ['Water'],
  Ice: ['Dragon'],
  Ground: ['Electric'],
  Dark: ['Neutral'],
  Dragon: ['Dark'],
};

/** Damage an attack of one element does to a single defending element */
function against(attacker: Element, defender: Element): number {
  if (STRONG_AGAINST[attacker].includes(defender)) return 2;
  // every element but Neutral resists itself, and each is resisted by whatever it is weak to
  if (attacker !== 'Neutral' && attacker === defender) return 0.5;
  if (STRONG_AGAINST[defender].includes(attacker))
    return attacker === 'Neutral' ? 1 : 0.5;
  return 1;
}

/** Damage multiplier of an attack against a Pal with one or two elements */
export function multiplier(attacker: Element, defenders: Element[]): number {
  return defenders.reduce((m, d) => m * against(attacker, d), 1);
}

/** Every attacking element's multiplier against these defending elements */
export function defenceChart(defenders: Element[]): Record<Element, number> {
  return Object.fromEntries(
    ELEMENTS.map((e) => [e, multiplier(e, defenders)])
  ) as Record<Element, number>;
}

export function formatMultiplier(m: number) {
  return m === 0.5 ? '½×' : m === 0.25 ? '¼×' : `${m}×`;
}
