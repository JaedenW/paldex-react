import type { BreedMethod } from './breeding';

export const METHOD_LABELS: Record<BreedMethod, string> = {
  same: 'Two of the same species',
  listed: 'A fixed pairing',
  gender: 'Depends on which parent is the mother',
  rank: 'By breeding rank',
};
