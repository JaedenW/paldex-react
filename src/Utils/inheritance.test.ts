import { describe, expect, it } from 'vitest';
import {
  activeSkillEach,
  choose,
  passiveOdds,
  percent,
  wantedOdds,
} from './inheritance';

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 10);

describe('choose', () => {
  it('counts combinations', () => {
    expect(choose(6, 4)).toBe(15);
    expect(choose(4, 2)).toBe(6);
    expect(choose(3, 0)).toBe(1);
    expect(choose(2, 3)).toBe(0);
  });
});

describe('passiveOdds', () => {
  it('matches the wiki table for inheriting every passive with no random extras', () => {
    // 1 passive: 40%, 2: 24%, 3: 12%, 4: 10%
    close(passiveOdds(1).allWithNoRandom, 0.4);
    close(passiveOdds(2).allWithNoRandom, 0.24);
    close(passiveOdds(3).allWithNoRandom, 0.12);
    close(passiveOdds(4).allWithNoRandom, 0.1);
  });

  it('has odds of every count that add up to one', () => {
    for (let n = 0; n <= 7; n++)
      close(
        passiveOdds(n).countOdds.reduce((a, b) => a + b, 0),
        1
      );
  });

  it('inherits a count capped by the pool size', () => {
    const two = passiveOdds(2).countOdds;
    close(two[1], 0.4);
    close(two[2], 0.6); // a roll of 2, 3 or 4 all inherit both
    expect(two[3]).toBe(0);
  });

  it('gives each passive the same chance, whoever has it', () => {
    close(passiveOdds(1).each, 1);
    close(passiveOdds(2).each, 0.4 * 0.5 + 0.6); // 80%
    close(passiveOdds(4).each, 0.4 * 0.25 + 0.3 * 0.5 + 0.2 * 0.75 + 0.1);
  });

  it('inherits nothing from an empty pool', () => {
    expect(passiveOdds(0).countOdds[0]).toBe(1);
    expect(passiveOdds(0).each).toBe(0);
  });

  it('cannot inherit a pool of more than four in one go', () => {
    expect(passiveOdds(6).allWithNoRandom).toBe(0);
    expect(passiveOdds(6).countOdds[4]).toBeCloseTo(0.1);
  });
});

describe('wantedOdds', () => {
  it('is certain to inherit nothing in particular', () => {
    expect(wantedOdds(3, 0).inherits).toBe(1);
  });

  it('gives the whole pool the same odds as passiveOdds', () => {
    for (let n = 1; n <= 4; n++) {
      close(wantedOdds(n, n).exactly, passiveOdds(n).allWithNoRandom);
      close(
        wantedOdds(n, n).inherits,
        passiveOdds(n)
          .countOdds.slice(n)
          .reduce((a, b) => a + b, 0)
      );
    }
  });

  it('shrinks when only some of the pool is wanted', () => {
    // two wanted out of four: roll 2 -> 1/6, roll 3 -> 2/4, roll 4 -> 1
    close(wantedOdds(4, 2).inherits, 0.3 / 6 + 0.2 * 0.5 + 0.1);
  });

  it('uses the wiki example of one specific set of four out of six', () => {
    // only a roll of 4 can carry four, and then 1 in C(6,4) = 15 choices is right
    close(wantedOdds(6, 4).inherits, 0.1 / 15);
  });

  it('is impossible to want more than the pool holds or four slots', () => {
    expect(wantedOdds(2, 3).inherits).toBe(0);
    expect(wantedOdds(6, 5).inherits).toBe(0);
  });

  it('asks for no random extras when wanting exactly some of the pool', () => {
    // exactly the 1 wanted of 2: roll of 1 (40%), the right one of 2 (1/2), no random (40%)
    close(wantedOdds(2, 1).exactly, 0.4 * 0.5 * 0.4);
  });
});

describe('activeSkillEach', () => {
  it('splits the 50% across the known skills', () => {
    close(activeSkillEach(2), 0.25);
    expect(activeSkillEach(0)).toBe(0);
  });
});

describe('percent', () => {
  it('trims trailing zeros', () => {
    expect(percent(0.4)).toBe('40%');
    expect(percent(0.016)).toBe('1.6%');
    expect(percent(0.1234, 1)).toBe('12.3%');
  });
});
