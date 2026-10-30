import type { ReactNode } from 'react';
import { Link } from 'react-router';
import ElementBadge from './ElementBadge';
import PalImage from './PalImage';
import { Panel, SectionLabel } from './ui';
import type { BreedResult } from '../Utils/breeding';
import { METHOD_LABELS } from '../Utils/breedingText';
import {
  ALPHA_ODDS,
  MAX_PASSIVES,
  MUTATION_ODDS,
  NO_RANDOM_PASSIVE,
  POTENTIAL_ODDS,
  activeSkillEach,
  passiveOdds,
  percent,
  wantedOdds,
} from '../Utils/inheritance';
import type { ActiveSkill, Pal, PassiveSkill } from '../types';
import { cn } from '../Utils/cn';

/** The hatched Pal, with its egg, gender split and elements */
function ChildCard({ pal, note }: { pal: Pal; note?: string }) {
  return (
    <Link
      to={`/pal/${pal.id}`}
      className="flex flex-col items-center gap-1.5 rounded-2xl bg-pw-navy p-5 text-center text-white transition hover:bg-pw-deep"
    >
      <PalImage pal={pal} variant="art" className="size-32" />
      <p className="text-sm font-semibold tracking-wide text-white/70">
        #{pal.number}
      </p>
      <p className="font-display text-3xl font-bold">{pal.name}</p>
      <div className="flex gap-1">
        {pal.elements.map((e) => (
          <ElementBadge key={e} element={e} linked={false} size="sm" />
        ))}
      </div>
      <p className="text-sm text-white/70">
        {pal.breeding.egg || 'Egg'} · {pal.breeding.maleProbability ?? 50}% male
      </p>
      {note && (
        <p className="mt-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
          {note}
        </p>
      )}
    </Link>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-pw-cream px-1.5 py-0.5 font-mono text-sm font-semibold">
      {children}
    </span>
  );
}

/** The child plus the reasoning behind it */
export function ResultPanel({
  a,
  b,
  result,
}: {
  a: Pal;
  b: Pal;
  result: BreedResult;
}) {
  return (
    <Panel title="Offspring">
      <div className="grid gap-5 md:grid-cols-[minmax(0,16rem)_1fr]">
        {result.method === 'gender' && result.alternatives ? (
          <div className="grid gap-3">
            {result.alternatives.map((alt) => (
              <ChildCard
                key={alt.child.id}
                pal={alt.child}
                note={`If ${alt.mother.name} is the mother`}
              />
            ))}
          </div>
        ) : (
          <ChildCard pal={result.child} />
        )}

        <div>
          <p className="inline-flex rounded-full bg-pw-navy/10 px-3 py-1 text-sm font-semibold text-pw-heading">
            {METHOD_LABELS[result.method]}
          </p>
          {result.method === 'same' && (
            <p className="mt-3 text-pw-muted">
              Two {a.name} always have a {a.name}. Every Pal can be bred from
              two of its own species, and a few can only be bred that way.
            </p>
          )}
          {result.method === 'listed' && (
            <p className="mt-3 text-pw-muted">
              {a.name} and {b.name} are a fixed pairing, so the result doesn’t
              depend on breeding rank. A listed pairing always wins over the
              rank maths.
            </p>
          )}
          {result.method === 'gender' && (
            <p className="mt-3 text-pw-muted">
              This pairing gives a different Pal depending on which parent is
              the mother, so both outcomes are shown.
            </p>
          )}
          {result.method === 'rank' && result.rank && (
            <RankWorking a={a} b={b} rank={result.rank} chosen={result.child} />
          )}
        </div>
      </div>
    </Panel>
  );
}

function RankWorking({
  a,
  b,
  rank,
  chosen,
}: {
  a: Pal;
  b: Pal;
  rank: NonNullable<BreedResult['rank']>;
  chosen: Pal;
}) {
  return (
    <div className="mt-3 space-y-3">
      <p className="text-pw-muted">
        No fixed pairing applies, so the child is the eligible species whose
        breeding rank is closest to the parents’ average.
      </p>
      <p className="rounded-xl bg-pw-cream/70 px-3 py-2 text-sm">
        <Mono>
          ⌊({rank.a} + {rank.b} + 1) ÷ 2⌋ = {rank.target}
        </Mono>{' '}
        <span className="text-pw-muted">
          using {a.name}’s and {b.name}’s ranks
        </span>
      </p>
      <div>
        <SectionLabel className="mb-1">Nearest eligible species</SectionLabel>
        <ol className="divide-y rounded-xl border">
          {rank.candidates.map(({ pal, diff }) => (
            <li
              key={pal.id}
              className={cn(
                'flex items-center gap-3 px-3 py-1.5',
                pal.id === chosen.id && 'bg-pw-sun/20'
              )}
            >
              <PalImage pal={pal} className="size-8" />
              <Link
                to={`/pal/${pal.id}`}
                className="flex-1 font-semibold hover:underline"
              >
                {pal.name}
              </Link>
              <span className="text-sm text-pw-muted">
                rank {pal.breeding.rank}
              </span>
              <span className="w-16 text-right text-sm font-semibold">
                {diff === 0 ? 'exact' : `off by ${diff}`}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-1 text-xs text-pw-muted">
          If two species are equally close, the one the wiki lists first (its
          lower index number) wins.
        </p>
      </div>
    </div>
  );
}

function Bar({
  value,
  label,
  highlight,
}: {
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-2 text-sm">
      <span className="text-pw-muted">{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-pw-cream">
        <div
          className={cn(
            'h-full rounded-full',
            highlight ? 'bg-pw-sun' : 'bg-pw-teal'
          )}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="text-right font-semibold">{percent(value)}</span>
    </div>
  );
}

/** What the child will inherit, given the parents' passive and active skills */
export function TraitsPanel({
  passives,
  wanted,
  onToggleWanted,
  skills,
}: {
  /** The two parents' passives, with duplicates already removed */
  passives: PassiveSkill[];
  wanted: string[];
  onToggleWanted: (id: string) => void;
  /** Inheritable active skills the parents know, without duplicates */
  skills: ActiveSkill[];
}) {
  const odds = passiveOdds(passives.length);
  const wantedSet = new Set(wanted);
  const wantedCount = passives.filter((p) => wantedSet.has(p.id)).length;
  const goal = wantedOdds(passives.length, wantedCount);

  return (
    <Panel title="Traits">
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="text-lg text-pw-heading">Passive skills</h3>
          {passives.length === 0 ? (
            <p className="mt-2 text-pw-muted">
              Neither parent has a passive skill. Add some above to see how
              they’d pass down. The child can still roll random ones.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-pw-muted">
                {passives.length} unique passive
                {passives.length === 1 ? '' : 's'} between the parents. Select
                the ones you want to see the odds of getting them.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {passives.map((p) => {
                  const on = wantedSet.has(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        title={p.description}
                        onClick={() => onToggleWanted(p.id)}
                        className={cn(
                          'flex items-center gap-2 rounded-full px-3 py-1.5 text-left text-sm ring-1 transition',
                          on
                            ? 'bg-pw-navy text-white ring-pw-navy'
                            : 'bg-pw-field ring-pw-line hover:bg-pw-cream'
                        )}
                      >
                        <span className="font-semibold">{p.name}</span>
                        <span
                          className={cn(
                            'font-display text-base font-bold',
                            on ? 'text-pw-sun' : 'text-pw-link'
                          )}
                        >
                          {percent(odds.each)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {wantedCount > 0 && (
                <div className="mt-4 rounded-xl bg-pw-cream/70 p-3">
                  {wantedCount > MAX_PASSIVES ? (
                    <p className="text-sm">
                      A Pal can only have {MAX_PASSIVES} passives.
                    </p>
                  ) : (
                    <dl className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-xs font-semibold tracking-[0.12em] text-pw-muted uppercase">
                          Inherits all {wantedCount} you picked
                        </dt>
                        <dd className="font-display text-2xl font-bold">
                          {percent(goal.inherits)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold tracking-[0.12em] text-pw-muted uppercase">
                          Those and nothing else
                        </dt>
                        <dd className="font-display text-2xl font-bold">
                          {percent(goal.exactly)}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
              )}

              <div className="mt-4 space-y-1.5">
                <SectionLabel>How many the child inherits</SectionLabel>
                {odds.countOdds.map((p, k) =>
                  p > 0 ? (
                    <Bar
                      key={k}
                      label={`${k} passive${k === 1 ? '' : 's'}`}
                      value={p}
                    />
                  ) : null
                )}
              </div>
              {passives.length > MAX_PASSIVES && (
                <p className="mt-2 text-sm text-pw-muted">
                  With more than four to choose from, it can never inherit them
                  all.
                </p>
              )}
            </>
          )}
          <p className="mt-3 text-xs text-pw-muted">
            The inheritance roll gives 1, 2, 3 or 4 passives (40%, 30%, 20%,
            10%), picked at random from the pool. After that, random extra
            passives are added unless it fills all four slots; there’s a{' '}
            {percent(NO_RANDOM_PASSIVE, 0)} chance of none. Which parent has
            which passive doesn’t matter.
          </p>
        </section>

        <div className="space-y-6">
          <section>
            <h3 className="text-lg text-pw-heading">Active skills</h3>
            {skills.length === 0 ? (
              <p className="mt-1 text-pw-muted">
                Add skills the parents know above to see each one’s chance of
                being passed down.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-pw-muted">
                  There’s a {percent(0.5, 0)} chance the child gets one active
                  skill from its parents, and every skill either parent knows is
                  a candidate (assuming each is equally likely).
                </p>
                <ul className="mt-2 divide-y">
                  {skills.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 py-1.5"
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <ElementBadge
                          element={s.element}
                          linked={false}
                          size="sm"
                        />
                        {s.name}
                      </span>
                      <span className="font-display text-lg font-bold text-pw-link">
                        {percent(activeSkillEach(skills.length))}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-2 text-xs text-pw-muted">
              Exclusive skills can’t be passed down. To breed for one skill,
              keep the parents’ other skills to a minimum.
            </p>
          </section>

          <section>
            <h3 className="text-lg text-pw-heading">Potentials and extras</h3>
            <ul className="mt-1 space-y-1 text-sm text-pw-muted">
              <li>
                HP, attack and defense potential each come from the father (
                {percent(POTENTIAL_ODDS.father, 0)}), the mother (
                {percent(POTENTIAL_ODDS.mother, 0)}) or at random (
                {percent(POTENTIAL_ODDS.random, 0)}).
              </li>
              <li>
                A bred Pal has a {percent(ALPHA_ODDS, 0)} chance of being an
                Alpha, whatever the parents were.
              </li>
              <li>
                An egg has a {percent(MUTATION_ODDS.normal, 0)} chance (
                {percent(MUTATION_ODDS.withExtravagantCake, 0)} with an
                Extravagant Vegetable Cake) of mutating into a rarer Alpha with
                four passives.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </Panel>
  );
}
