/**
 * Pill colours shared by passive ranks, trait chips and Ancient technology:
 * gold for something good or rare, red for a drawback. Each sets a background,
 * text colour and ring colour, so add `ring-1` where an outline is wanted.
 */
export const TONES = {
  good: 'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-400/20 dark:text-amber-100 dark:ring-amber-400/40',
  bad: 'bg-red-100 text-red-800 ring-red-300 dark:bg-red-400/20 dark:text-red-100 dark:ring-red-400/40',
  plain: 'bg-pw-field text-pw-ink ring-pw-line',
};

export type Tone = keyof typeof TONES;

/** The tone for a passive skill's rank: positive is good, negative a drawback */
export const rankTone = (rank: number | null): Tone =>
  !rank ? 'plain' : rank > 0 ? 'good' : 'bad';
