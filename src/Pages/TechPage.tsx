import React from 'react';
import { Link, useLocation } from 'react-router';
import ItemIcon from '../Components/ItemIcon';
import { ItemLink } from '../Components/gearUi';
import {
  Chip,
  EmptyState,
  Page,
  PageHeader,
  Panel,
  SearchInput,
  buttonClass,
} from '../Components/ui';
import { buildingByName, techs } from '../data/gear';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { useQueryState } from '../Hooks/useQueryState';
import { byLevel, totalCost } from '../Utils/tech';
import { normalise } from '../Utils/text';
import type { Tech } from '../types';
import { cn } from '../Utils/cn';

const MAX_LEVEL = Math.max(...techs.map((t) => t.level));

export default function TechPage() {
  useDocumentTitle('Technology');
  const { hash } = useLocation();
  const [query, setQuery] = useQueryState('q');
  const [kind, setKind] = useQueryState('kind');
  const [levelParam, setLevel] = useQueryState('level');

  const level = Math.min(
    MAX_LEVEL,
    Math.max(0, Math.floor(Number(levelParam)) || 0)
  );

  const shown = React.useMemo(() => {
    const q = normalise(query.trim());
    return techs
      .filter((t) => !kind || (kind === 'ancient') === !!t.ancient)
      .filter((t) => !level || t.level <= level)
      .filter(
        (t) =>
          !q ||
          normalise(t.name).includes(q) ||
          (t.unlocks ?? []).some((u) => normalise(u.name).includes(q))
      );
  }, [query, kind, level]);

  const groups = React.useMemo(() => byLevel(shown), [shown]);
  const total = totalCost(shown);

  React.useEffect(() => {
    if (hash)
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ block: 'center' });
  }, [hash]);

  return (
    <Page>
      <PageHeader
        title="Technology"
        subtitle={`${techs.length} technologies, unlocked by player level. Filter by level to see what each stage unlocks and what it costs.`}
      >
        <Link to="/items" className={buttonClass('accent')}>
          Items
        </Link>
      </PageHeader>

      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search technologies or unlocks"
          />
          <label className="flex items-center gap-2 text-sm font-semibold">
            Up to level
            <input
              type="number"
              min={0}
              max={MAX_LEVEL}
              value={levelParam}
              placeholder="all"
              onChange={(e) => setLevel(e.target.value)}
              className="h-10 w-20 rounded-full border bg-white px-3 text-base"
            />
          </label>
          <Chip
            active={kind === 'ancient'}
            onClick={() => setKind(kind === 'ancient' ? '' : 'ancient')}
          >
            Ancient
          </Chip>
          <Chip
            active={kind === 'normal'}
            onClick={() => setKind(kind === 'normal' ? '' : 'normal')}
          >
            Regular
          </Chip>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
          <Summary label="Technologies">{total.count}</Summary>
          <Summary label="Technology points">{total.points}</Summary>
          <Summary label="Ancient points">{total.ancientPoints}</Summary>
        </dl>
      </Panel>

      {groups.length === 0 ? (
        <EmptyState title="No technologies match">
          Try removing a filter.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            return (
              <section
                key={g.level}
                id={`level-${g.level}`}
                className="scroll-mt-4"
              >
                <div className="mb-2 flex items-center gap-3">
                  <h2 className="flex h-9 items-center rounded-full bg-pw-navy px-4 text-xl text-white">
                    Level {g.level}
                  </h2>
                  <span className="text-sm text-pw-muted">
                    {totalCost(g.techs).points} pts
                    {totalCost(g.techs).ancientPoints
                      ? `, ${totalCost(g.techs).ancientPoints} ancient`
                      : ''}
                  </span>
                </div>
                <ul className="grid gap-2 md:grid-cols-2">
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
      )}
    </Page>
  );
}

function Summary({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-pw-muted uppercase">
        {label}
      </dt>
      <dd className="font-display text-2xl font-bold">{children}</dd>
    </div>
  );
}

function TechCard({ tech, highlight }: { tech: Tech; highlight: boolean }) {
  return (
    <li
      id={tech.id}
      className={cn(
        'rounded-2xl border bg-pw-paper p-3 shadow-card transition',
        highlight && 'ring-2 ring-pw-teal'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-display text-xl">{tech.name}</h3>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold',
                tech.ancient
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-pw-navy/10 text-pw-navy'
              )}
            >
              {tech.cost} {tech.ancient ? 'ancient pt' : 'pt'}
              {tech.cost === 1 ? '' : 's'}
            </span>
          </div>
          {tech.requires && (
            <p className="text-sm text-pw-muted">Requires: {tech.requires}</p>
          )}
          {tech.unlocks && tech.unlocks.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {tech.unlocks.map((u) => {
                const building =
                  u.kind === 'building'
                    ? buildingByName.get(u.name)
                    : undefined;
                return (
                  <li key={`${u.kind}${u.name}`}>
                    {u.kind === 'item' ? (
                      <ItemLink name={u.name} />
                    ) : building ? (
                      <Link
                        to={`/building/${building.id}`}
                        className="inline-flex items-center gap-2 font-semibold hover:underline"
                      >
                        <ItemIcon
                          kind="building"
                          id={building.id}
                          name={building.name}
                          className="size-8"
                        />
                        {u.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{u.name}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}
