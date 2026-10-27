// How a bred Pal's traits are decided, per the wiki's Breeding page.

/** Chance the passive-inheritance roll comes up 1, 2, 3 or 4 */
export const PASSIVE_ROLL = [0.4, 0.3, 0.2, 0.1];
/** Chance no random passives are added when the inherited ones leave a free slot */
export const NO_RANDOM_PASSIVE = 0.4;
/** A Pal has at most four passives */
export const MAX_PASSIVES = 4;
/** Chance a bred Pal passes down one active skill */
export const ACTIVE_SKILL_ODDS = 0.5;
/** Each of HP, attack and defense potential: from the father, mother, or random */
export const POTENTIAL_ODDS = { father: 0.3, mother: 0.3, random: 0.4 };
export const ALPHA_ODDS = 0.05;
export const MUTATION_ODDS = { normal: 0.01, withExtravagantCake: 0.03 };

/** Ways to choose k from n */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++)
    result = (result * (n - i + 1)) / i;
  return Math.round(result);
}

/** The inheritance roll's chance of rolling at least x */
const rollAtLeast = (x: number) =>
  PASSIVE_ROLL.slice(x - 1).reduce((a, b) => a + b, 0);

export interface PassiveOdds {
  /** Unique passives between the two parents */
  pool: number;
  /** Chance of the child inheriting exactly this many, by index 0 to 4 */
  countOdds: number[];
  /** Chance of inheriting any one particular passive from the pool */
  each: number;
  /** Chance of inheriting every one of them and gaining no random extras */
  allWithNoRandom: number;
}

/**
 * The parents' passives are pooled with duplicates dropped. A roll of 1 to 4
 * says how many the child inherits, picked at random, or all of them when the
 * roll is at least the pool size. Random extras may follow if a slot is free.
 */
export function passiveOdds(poolSize: number): PassiveOdds {
  const countOdds = [0, 0, 0, 0, 0];
  if (poolSize === 0) {
    countOdds[0] = 1;
  } else {
    for (let x = 1; x <= MAX_PASSIVES; x++)
      countOdds[Math.min(x, poolSize)] += PASSIVE_ROLL[x - 1];
  }
  const each =
    poolSize === 0
      ? 0
      : PASSIVE_ROLL.reduce(
          (sum, p, i) => sum + p * (Math.min(i + 1, poolSize) / poolSize),
          0
        );
  // Inheriting everything uses a free slot unless the pool fills all four
  const all =
    poolSize === 0
      ? 1
      : rollAtLeast(poolSize > MAX_PASSIVES ? Infinity : poolSize);
  return {
    pool: poolSize,
    countOdds,
    each,
    allWithNoRandom:
      poolSize > MAX_PASSIVES
        ? 0
        : all * (poolSize === MAX_PASSIVES ? 1 : NO_RANDOM_PASSIVE),
  };
}

/**
 * Chance of a particular wanted set of `wanted` passives, out of a pool of
 * `poolSize`: that the child inherits all of them, and that it inherits them
 * and nothing else with no random extras.
 */
export function wantedOdds(
  poolSize: number,
  wanted: number
): { inherits: number; exactly: number } {
  if (wanted === 0) return { inherits: 1, exactly: 0 };
  if (wanted > poolSize || wanted > MAX_PASSIVES)
    return { inherits: 0, exactly: 0 };

  let inherits = 0;
  for (let x = 1; x <= MAX_PASSIVES; x++) {
    const chosen = Math.min(x, poolSize);
    // the wanted ones all land among the `chosen` picks
    inherits +=
      PASSIVE_ROLL[x - 1] *
      (choose(poolSize - wanted, chosen - wanted) / choose(poolSize, chosen));
  }

  // exactly the wanted ones: the roll picks that many (or the whole pool) and they are the right ones
  let exact: number;
  if (wanted === poolSize) exact = rollAtLeast(poolSize);
  else exact = PASSIVE_ROLL[wanted - 1] / choose(poolSize, wanted);
  return {
    inherits,
    exactly: exact * (wanted === MAX_PASSIVES ? 1 : NO_RANDOM_PASSIVE),
  };
}

/** Chance each of `pool` known skills is passed down, assuming they are equally likely */
export const activeSkillEach = (pool: number) =>
  pool === 0 ? 0 : ACTIVE_SKILL_ODDS / pool;

export const percent = (p: number, digits = 1) =>
  `${(p * 100)
    .toFixed(digits)
    .replace(/\.0+$/, '')
    .replace(/(\.\d)0$/, '$1')}%`;
