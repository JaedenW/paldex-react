import React from 'react';
import { useLocation } from 'react-router';
import TechCard, { techCategoryKeys } from '../Components/TechCard';
import {
  Chip,
  EmptyState,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Stat,
  Toolbar,
  buttonClass,
} from '../Components/ui';
import { techs } from '../data/gear';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { useQueryState } from '../Hooks/useQueryState';
import {
  byLevel,
  runningTotals,
  totalCost,
  unlockCategory,
} from '../Utils/tech';
import { normalise } from '../Utils/text';
import { cn } from '../Utils/cn';

const MAX_LEVEL = Math.max(...techs.map((t) => t.level));
const totals = runningTotals(techs);

/** The level whose section is nearest the top of the screen, for the level list */
function useActiveLevel(levels: number[]) {
  const [active, setActive] = React.useState<number>();
  const key = levels.join(',');
  React.useEffect(() => {
    const els = levels
      .map((l) => document.getElementById(`level-${l}`))
      .filter((e): e is HTMLElement => !!e);
    if (els.length === 0) return;
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const level = Number((e.target as HTMLElement).dataset.level);
          if (e.isIntersecting) visible.add(level);
          else visible.delete(level);
        }
        if (visible.size) setActive(Math.min(...visible));
      },
      { rootMargin: '-130px 0px -60% 0px' }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}

const goToLevel = (level: number) =>
  document
    .getElementById(`level-${level}`)
    ?.scrollIntoView({ block: 'start', behavior: 'smooth' });

export default function TechPage() {
  useDocumentTitle('Technology');
  const { hash } = useLocation();
  const [query, setQuery] = useQueryState('q');
  const [kind, setKind] = useQueryState('kind');
  const [unlocks, setUnlocks] = useQueryState('unlocks');
  const [levelParam, setLevel] = useQueryState('level');

  const level = Math.min(
    MAX_LEVEL,
    Math.max(0, Math.floor(Number(levelParam)) || 0)
  );

  // what each tech unlocks, by category, for the filter and its counts
  const techKeys = React.useMemo(
    () => new Map(techs.map((t) => [t.id, techCategoryKeys(t)])),
    []
  );
  const categoryOptions = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const keys of techKeys.values())
      for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
    const label = (key: string) => {
      const [kindPart, type] = key.split(':');
      return unlockCategory(kindPart as 'item' | 'building', type).label;
    };
    return [
      { value: '', label: 'Unlocks anything' },
      ...[...counts]
        .map(([key, n]) => ({ value: key, label: `${label(key)} (${n})` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [techKeys]);

  const shown = React.useMemo(() => {
    const q = normalise(query.trim());
    return techs
      .filter((t) => !kind || (kind === 'ancient') === !!t.ancient)
      .filter((t) => !level || t.level <= level)
      .filter((t) => !unlocks || techKeys.get(t.id)?.includes(unlocks))
      .filter(
        (t) =>
          !q ||
          normalise(t.name).includes(q) ||
          (t.unlocks ?? []).some((u) => normalise(u.name).includes(q))
      );
  }, [query, kind, level, unlocks, techKeys]);

  const groups = React.useMemo(() => byLevel(shown), [shown]);
  const sum = totalCost(shown);
  const active = useActiveLevel(groups.map((g) => g.level));
  const filtered = !!(query || kind || unlocks || level);

  React.useEffect(() => {
    if (hash)
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ block: 'center' });
  }, [hash]);

  const counts = {
    all: techs.length,
    regular: techs.filter((t) => !t.ancient).length,
    ancient: techs.filter((t) => t.ancient).length,
  };

  const setLevelClamped = (n: number) =>
    setLevel(n <= 0 ? '' : String(Math.min(MAX_LEVEL, n)));

  const levelList = (
    <>
      {groups.map((g) => (
        <button
          key={g.level}
          type="button"
          onClick={() => goToLevel(g.level)}
          aria-current={active === g.level ? 'true' : undefined}
          className={cn(
            'flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm font-semibold transition',
            active === g.level
              ? 'bg-pw-sun text-pw-deep'
              : 'text-pw-ink hover:bg-pw-cream'
          )}
        >
          <span>Lv {g.level}</span>
          <span
            className={cn(
              'text-xs font-normal',
              active === g.level ? 'text-pw-deep/70' : 'text-pw-muted'
            )}
          >
            {g.techs.length}
          </span>
        </button>
      ))}
    </>
  );

  return (
    <Page>
      <PageHeader
        eyebrow="Items & Base"
        title="Technology"
        subtitle={`${techs.length} technologies, unlocked at set player levels. Each costs technology points; ancient technologies cost ancient technology points instead.`}
      />

      <Toolbar stickyOnPhones={false}>
        <div
          className="flex gap-1.5"
          role="tablist"
          aria-label="Kind of technology"
        >
          {(
            [
              ['', 'All', counts.all],
              ['normal', 'Regular', counts.regular],
              ['ancient', 'Ancient', counts.ancient],
            ] as const
          ).map(([value, label, n]) => (
            <Chip
              key={label}
              role="tab"
              aria-selected={kind === value}
              active={kind === value}
              onClick={() => setKind(value)}
            >
              {label} <span className="font-normal opacity-70">{n}</span>
            </Chip>
          ))}
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by name or what it unlocks"
        />
        <Select
          label="Unlocks"
          value={unlocks}
          onChange={setUnlocks}
          options={categoryOptions}
        />
        {filtered && (
          <button
            type="button"
            className={buttonClass('secondary', 'h-9')}
            onClick={() => {
              setQuery('');
              setKind('');
              setUnlocks('');
              setLevel('');
            }}
          >
            Clear filters
          </button>
        )}
      </Toolbar>

      <section
        className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 card p-4"
        aria-label="Plan by level"
      >
        <div>
          <label
            htmlFor="my-level"
            className="block text-xs font-semibold tracking-[0.12em] text-pw-muted uppercase"
          >
            My level
          </label>
          <div className="mt-1 flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Lower level"
              className={buttonClass('secondary', 'size-10 px-0!')}
              disabled={level === 0}
              onClick={() => setLevelClamped(level - 1)}
            >
              −
            </button>
            <input
              id="my-level"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_LEVEL}
              value={levelParam}
              placeholder="All"
              onChange={(e) => setLevel(e.target.value)}
              className="h-10 w-20 rounded-full border bg-pw-field text-center text-base outline-none focus:border-pw-teal"
            />
            <button
              type="button"
              aria-label="Raise level"
              className={buttonClass('secondary', 'size-10 px-0!')}
              disabled={level >= MAX_LEVEL}
              onClick={() => setLevelClamped(level + 1)}
            >
              +
            </button>
          </div>
          <p className="mt-1 text-xs text-pw-muted">
            {level
              ? `Showing levels 1–${level}`
              : `Showing all ${MAX_LEVEL} levels`}
          </p>
        </div>
        <dl className="grid min-w-0 flex-1 grid-cols-3 gap-2 sm:max-w-xl">
          <Stat label="Technologies">{sum.count}</Stat>
          <Stat label="Tech points">{sum.points}</Stat>
          <Stat label="Ancient points">{sum.ancientPoints}</Stat>
        </dl>
      </section>

      {groups.length === 0 ? (
        <EmptyState title="No technologies match">
          Try removing a filter.
        </EmptyState>
      ) : (
        <div className="lg:grid lg:grid-cols-[10.5rem_minmax(0,1fr)] lg:gap-6">
          <nav aria-label="Jump to a level" className="hidden lg:block">
            <div className="sticky top-20 flex max-h-[calc(100dvh-7rem)] flex-col gap-0.5 overflow-y-auto card p-1.5">
              {levelList}
            </div>
          </nav>

          <div className="min-w-0">
            <nav
              aria-label="Jump to a level"
              className="-m-1.5 mb-1 flex gap-1.5 overflow-x-auto p-1.5 lg:hidden"
            >
              {groups.map((g) => (
                <Chip
                  key={g.level}
                  onClick={() => goToLevel(g.level)}
                  className="h-8 shrink-0 px-3"
                  aria-pressed={active === g.level}
                  active={active === g.level}
                >
                  {g.level}
                </Chip>
              ))}
            </nav>

            <div className="space-y-8">
              {groups.map((g) => {
                const cost = totalCost(g.techs);
                const running = totals.get(g.level);
                return (
                  <section
                    key={g.level}
                    id={`level-${g.level}`}
                    data-level={g.level}
                    className="scroll-mt-20"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="flex h-9 items-center gap-2 rounded-full bg-pw-navy px-4 text-xl text-white">
                        <span
                          aria-hidden="true"
                          className="size-2 rotate-45 bg-pw-sun"
                        />
                        Level {g.level}
                      </h2>
                      <span className="text-sm text-pw-muted">
                        {g.techs.length} tech{g.techs.length === 1 ? '' : 's'}
                        {cost.points > 0 &&
                          ` · ${cost.points} pt${cost.points === 1 ? '' : 's'}`}
                        {cost.ancientPoints > 0 &&
                          ` · ${cost.ancientPoints} ancient`}
                      </span>
                      {running && (
                        <span
                          className="text-xs text-pw-muted sm:ml-auto"
                          title="Points to unlock every technology up to this level"
                        >
                          Running total {running.points} pts
                          {running.ancientPoints > 0 &&
                            ` · ${running.ancientPoints} ancient`}
                        </span>
                      )}
                    </div>
                    <ul className="grid-fluid [--min:24rem]">
                      {g.techs.map((t) => (
                        <TechCard
                          key={t.id}
                          tech={t}
                          highlight={hash === `#${t.id}`}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
