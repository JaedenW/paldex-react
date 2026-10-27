import React from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  palById,
  pals,
  passiveByName,
  skillByName,
  uniqueCombos,
  items,
} from '../data';
import ElementBadge from '../Components/ElementBadge';
import PalImage from '../Components/PalImage';
import ObtainTab from '../Components/ObtainTab';
import WorkLevel from '../Components/WorkLevel';
import { Breadcrumb, Chip, Page, Panel } from '../Components/ui';
import NotFoundPage from './NotFoundPage';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { useQueryState } from '../Hooks/useQueryState';
import { createBreeder } from '../Utils/breeding';
import {
  defenceChart,
  ELEMENTS,
  formatMultiplier,
  elementColours,
} from '../Utils/elements';
import { compareNumbers, formatNumber } from '../Utils/text';
import { workDescriptions, workId } from '../Utils/work';
import type { Drop, Pal, PalStats, WorkType } from '../types';
import { cn } from '../Utils/cn';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'obtain', label: 'How to get' },
  { id: 'skills', label: 'Skills' },
  { id: 'breeding', label: 'Breeding' },
  { id: 'drops', label: 'Drops' },
] as const;

const ordered = [...pals].sort(
  (a, b) => compareNumbers(a.number, b.number) || a.name.localeCompare(b.name)
);
const maxStat = (key: 'hp' | 'attack' | 'defense' | 'workSpeed') =>
  Math.max(
    ...pals.map((p) => p.stats[key] ?? 0),
    ...pals.map((p) => p.alphaStats?.[key] ?? 0)
  );
const STAT_MAX = {
  hp: maxStat('hp'),
  attack: maxStat('attack'),
  defense: maxStat('defense'),
  workSpeed: maxStat('workSpeed'),
};

export default function PalPage() {
  const { id } = useParams();
  const pal = palById.get(id ?? '');
  const navigate = useNavigate();
  const [tab, setTab] = useQueryState('tab', 'overview');
  useDocumentTitle(pal?.name);

  const index = pal ? ordered.indexOf(pal) : -1;
  const prev = ordered[index - 1],
    next = ordered[index + 1];

  // ← → move between neighbouring Pals
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).matches('input, select, textarea') ||
        e.metaKey ||
        e.ctrlKey
      )
        return;
      const target =
        e.key === 'ArrowLeft'
          ? prev
          : e.key === 'ArrowRight'
            ? next
            : undefined;
      if (target) navigate(`/pal/${target.id}${window.location.search}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, navigate]);

  if (!pal) return <NotFoundPage />;
  const colour = elementColours[pal.elements[0]] ?? '#8c8a82';

  return (
    <Page>
      <Breadcrumb to="/paldex" label="Paldex" />

      <section className="relative overflow-hidden rounded-3xl border bg-pw-paper shadow-card">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-40 opacity-25"
          style={{
            background: `linear-gradient(135deg, ${colour}, transparent)`,
          }}
        />
        <div className="relative flex flex-col items-center gap-6 p-5 sm:flex-row sm:p-8">
          <PalImage
            pal={pal}
            variant="art"
            className="size-48 shrink-0 drop-shadow-lg sm:size-56"
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="font-semibold tracking-wide text-pw-muted">
              #{pal.number}
            </p>
            <h1 className="text-5xl sm:text-6xl">{pal.name}</h1>
            {pal.title && (
              <p className="mt-1 font-display text-xl text-pw-teal-dark">
                {pal.title}
              </p>
            )}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {pal.elements.map((e) => (
                <ElementBadge key={e} element={e} size="lg" />
              ))}
              {pal.nocturnal && (
                <span className="inline-flex h-9 items-center rounded-full bg-pw-deep px-4 font-semibold text-white">
                  Nocturnal
                </span>
              )}
            </div>
            {pal.description && (
              <p className="mt-4 max-w-prose text-pw-muted">
                {pal.description}
              </p>
            )}
          </div>
        </div>
        <div className="relative flex items-center justify-between border-t bg-pw-cream/60 px-4 py-2 text-sm font-semibold">
          {prev ? (
            <Link
              to={`/pal/${prev.id}${window.location.search}`}
              className="hover:underline"
            >
              ← #{prev.number} {prev.name}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              to={`/pal/${next.id}${window.location.search}`}
              className="hover:underline"
            >
              #{next.number} {next.name} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <Chip
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {tab === 'obtain' ? (
          <ObtainTab pal={pal} />
        ) : tab === 'skills' ? (
          <SkillsTab pal={pal} />
        ) : tab === 'breeding' ? (
          <BreedingTab pal={pal} />
        ) : tab === 'drops' ? (
          <DropsTab pal={pal} />
        ) : (
          <OverviewTab pal={pal} />
        )}
      </div>
    </Page>
  );
}

function StatBar({
  label,
  value,
  max,
  colour,
}: {
  label: string;
  value: number | null;
  max: number;
  colour: string;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_3rem_1fr] items-center gap-3">
      <span className="text-sm font-semibold text-pw-muted">{label}</span>
      <span className="text-right font-display text-xl font-bold">
        {formatNumber(value)}
      </span>
      <div className="h-2.5 overflow-hidden rounded-full bg-pw-cream">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, ((value ?? 0) / max) * 100)}%`,
            backgroundColor: colour,
          }}
        />
      </div>
    </div>
  );
}

function Fact({
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
      <dd className="font-display text-xl font-bold">{children}</dd>
    </div>
  );
}

function OverviewTab({ pal }: { pal: Pal }) {
  const [alpha, setAlpha] = React.useState(false);
  const stats: PalStats = alpha && pal.alphaStats ? pal.alphaStats : pal.stats;
  const defence = defenceChart(pal.elements);
  const work = Object.entries(pal.work) as [WorkType, number][];

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Base stats"
          actions={
            pal.alphaStats && (
              <Chip active={alpha} onClick={() => setAlpha(!alpha)}>
                Alpha
              </Chip>
            )
          }
        >
          <div className="space-y-2.5">
            <StatBar
              label="HP"
              value={stats.hp}
              max={STAT_MAX.hp}
              colour="#e5484d"
            />
            <StatBar
              label="Attack"
              value={stats.attack}
              max={STAT_MAX.attack}
              colour="#f59e0b"
            />
            <StatBar
              label="Defense"
              value={stats.defense}
              max={STAT_MAX.defense}
              colour="#3b82d6"
            />
            <StatBar
              label="Work speed"
              value={stats.workSpeed}
              max={STAT_MAX.workSpeed}
              colour="#1fb5a8"
            />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3">
            <Fact label="Stamina">{formatNumber(stats.stamina)}</Fact>
            <Fact label="Walk / run">
              {formatNumber(stats.walk)} / {formatNumber(stats.run)}
            </Fact>
            <Fact label="Ride sprint">{formatNumber(stats.rideSprint)}</Fact>
            <Fact label="Swim">{formatNumber(stats.swim)}</Fact>
            <Fact label="Transport">{formatNumber(stats.transport)}</Fact>
            <Fact label="Capture rate">
              {formatNumber(stats.captureRate, 2)}×
            </Fact>
          </dl>
        </Panel>

        <div className="space-y-4">
          <Panel title="Work suitability">
            {work.length === 0 ? (
              <p className="text-pw-muted">
                This Pal can’t be assigned base work.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {work.map(([type, level]) => (
                  <li key={type}>
                    <Link
                      to={`/work/${workId(type)}`}
                      title={workDescriptions[type]}
                      className="flex items-center justify-between rounded-xl bg-pw-cream/70 px-3 py-2 transition hover:bg-pw-cream"
                    >
                      <span className="font-semibold">{type}</span>
                      <WorkLevel level={level} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {pal.partnerSkill && (
            <Panel title="Partner skill">
              <p className="font-display text-2xl font-bold">
                {pal.partnerSkill.name}
              </p>
              <p className="text-xs font-semibold tracking-wide text-pw-teal-dark uppercase">
                {pal.partnerSkill.type}
              </p>
              <p className="mt-2 whitespace-pre-line text-pw-muted">
                {pal.partnerSkill.description}
              </p>
            </Panel>
          )}
        </div>
      </div>

      <Panel title="Element matchups" className="">
        <p className="mb-3 text-sm text-pw-muted">
          Damage this Pal takes from each element.
        </p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {ELEMENTS.map((e) => (
            <li
              key={e}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-pw-cream/70 p-2"
            >
              <ElementBadge element={e} size="sm" />
              <span
                className={cn(
                  'font-display text-xl font-bold',
                  defence[e] > 1 && 'text-red-600',
                  defence[e] < 1 && 'text-pw-teal-dark'
                )}
              >
                {formatMultiplier(defence[e])}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Details">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Fact label="Size">{pal.size || '–'}</Fact>
          <Fact label="Food">{pal.hunger ?? '–'}</Fact>
          <Fact label="Sell price">{formatNumber(pal.sellPrice)}</Fact>
          <Fact label="EXP ratio">{formatNumber(stats.expRatio, 2)}×</Fact>
        </dl>
      </Panel>
    </>
  );
}

function SkillsTab({ pal }: { pal: Pal }) {
  return (
    <>
      <Panel title="Active skills">
        {pal.activeSkills.length === 0 ? (
          <p className="text-pw-muted">No learnable skills.</p>
        ) : (
          <ul className="divide-y">
            {pal.activeSkills.map((s) => {
              const info = skillByName.get(s.name);
              return (
                <li
                  key={`${s.name}-${s.level}`}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span className="w-16 shrink-0 text-sm font-semibold text-pw-muted">
                    Lv. {s.level}
                  </span>
                  <div className="min-w-0 flex-1">
                    {info ? (
                      <Link
                        to={`/skill/${info.id}`}
                        className="font-display text-xl font-bold hover:underline"
                      >
                        {s.name}
                      </Link>
                    ) : (
                      <span className="font-display text-xl font-bold">
                        {s.name}
                      </span>
                    )}
                    {info && (
                      <p className="text-sm text-pw-muted">
                        {info.description}
                      </p>
                    )}
                  </div>
                  {info && (
                    <div className="flex shrink-0 items-center gap-3 text-right">
                      <div className="hidden text-sm sm:block">
                        <span className="text-pw-muted">Power</span>{' '}
                        <b>{info.power ?? '–'}</b>
                        <br />
                        <span className="text-pw-muted">CT</span>{' '}
                        <b>{info.cooldown ?? '–'}s</b>
                      </div>
                      <ElementBadge element={info.element} size="sm" />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <Panel title="Passive skills">
        {pal.passiveSkills.length === 0 ? (
          <p className="text-pw-muted">This Pal has no fixed passive skills.</p>
        ) : (
          <ul className="space-y-2">
            {pal.passiveSkills.map((name) => (
              <li key={name} className="rounded-xl bg-pw-cream/70 px-3 py-2">
                <Link
                  to={`/passives#${passiveByName.get(name)?.id ?? ''}`}
                  className="font-display text-xl font-bold hover:underline"
                >
                  {name}
                </Link>
                <p className="text-sm text-pw-muted">
                  {passiveByName.get(name)?.description}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function PalLink({ pal }: { pal: Pal }) {
  return (
    <Link
      to={`/pal/${pal.id}`}
      className="flex items-center gap-2 rounded-xl bg-pw-cream/70 px-2.5 py-1.5 transition hover:bg-pw-cream"
    >
      <PalImage pal={pal} className="size-9" />
      <span className="font-semibold">{pal.name}</span>
    </Link>
  );
}

function BreedingTab({ pal }: { pal: Pal }) {
  const [showAll, setShowAll] = React.useState(false);
  const parents = React.useMemo(
    () => createBreeder(pals, uniqueCombos).parentsOf(pal),
    [pal]
  );
  const visible = showAll ? parents : parents.slice(0, 24);

  return (
    <>
      <Panel title="Breeding">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Fact label="Breeding rank">{pal.breeding.rank}</Fact>
          <Fact label="Egg">{pal.breeding.egg || '–'}</Fact>
          <Fact label="Male chance">
            {pal.breeding.maleProbability ?? '–'}%
          </Fact>
          <Fact label="Tie-break priority">
            {formatNumber(pal.breeding.priority)}
          </Fact>
        </dl>
        <p className="mt-4 text-sm text-pw-muted">
          Lower ranks are stronger. A child takes the rank nearest the parents’
          average unless the pair is a listed unique combination.
        </p>
      </Panel>
      <Panel
        title={`Parents (${parents.length})`}
        actions={
          <Link
            to={`/breeding?a=${pal.id}`}
            className="text-sm font-semibold text-pw-teal-dark hover:underline"
          >
            Open calculator
          </Link>
        }
      >
        {parents.length === 0 ? (
          <p className="text-pw-muted">
            No parent pair produces this Pal; it’s likely only available in the
            wild.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {visible.map(([a, b]) => (
                <li
                  key={`${a.id}-${b.id}`}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"
                >
                  <PalLink pal={a} />
                  <span className="font-bold text-pw-sun">+</span>
                  <PalLink pal={b} />
                </li>
              ))}
            </ul>
            {parents.length > visible.length && (
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-pw-teal-dark hover:underline"
                onClick={() => setShowAll(true)}
              >
                Show all {parents.length} pairs
              </button>
            )}
          </>
        )}
      </Panel>
    </>
  );
}

function DropList({ drops }: { drops: Drop[] }) {
  if (drops.length === 0)
    return <p className="text-pw-muted">No drops recorded.</p>;
  return (
    <ul className="divide-y">
      {drops.map((d) => (
        <li
          key={d.item}
          className="flex items-center justify-between gap-3 py-2"
        >
          <span className="font-semibold">{d.item}</span>
          <span className="shrink-0 text-sm text-pw-muted">
            {d.min === d.max ? `×${d.min}` : `×${d.min}–${d.max}`} · {d.chance}%
            {items[d.item]?.type ? ` · ${items[d.item].type}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DropsTab({ pal }: { pal: Pal }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Drops">
        <DropList drops={pal.drops} />
      </Panel>
      <Panel title="Alpha drops">
        <DropList drops={pal.alphaDrops} />
      </Panel>
    </div>
  );
}
