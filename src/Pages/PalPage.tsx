import React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import {
  linkableDrops,
  palById,
  breeder,
  pals,
  passiveByName,
  skillByName,
} from '../data';
import ElementBadge from '../Components/ElementBadge';
import PalImage from '../Components/PalImage';
import ObtainTab from '../Components/ObtainTab';
import ParentPairList, {
  MethodChips,
  filterPairs,
} from '../Components/ParentPairList';
import ItemIcon from '../Components/ItemIcon';
import Tile from '../Components/Tile';
import WorkLevel from '../Components/WorkLevel';
import {
  Breadcrumbs,
  Chip,
  Page,
  Panel,
  Stat,
  Toolbar,
  SearchInput,
} from '../Components/ui';
import NotFoundPage from './NotFoundPage';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { useQueryState } from '../Hooks/useQueryState';
import {
  defenceChart,
  ELEMENTS,
  formatMultiplier,
  elementColours,
} from '../Utils/elements';
import { compareNumbers, formatNumber, slugify } from '../Utils/text';
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
  const { search } = useLocation();
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
      if (target) navigate(`/pal/${target.id}${search}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, search, navigate]);

  if (!pal) return <NotFoundPage />;
  const colour = elementColours[pal.elements[0]] ?? '#8c8a82';

  return (
    <Page>
      <Breadcrumbs
        items={[{ label: 'Paldex', to: '/paldex' }, { label: pal.name }]}
      />

      <section className="relative overflow-hidden card rounded-3xl">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse at 20% 0%, ${colour}, transparent 60%), linear-gradient(135deg, ${colour}33, transparent 55%)`,
          }}
        />
        <div className="relative flex flex-col items-center gap-6 p-5 sm:flex-row sm:p-8">
          <PalImage
            pal={pal}
            variant="art"
            className="size-52 shrink-0 drop-shadow-xl sm:size-64"
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="font-semibold tracking-wide text-pw-muted">
              #{pal.number}
            </p>
            <h1 className="text-5xl sm:text-7xl">{pal.name}</h1>
            {pal.title && (
              <p className="mt-1 font-display text-xl text-pw-link sm:text-2xl">
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
        <dl className="relative grid grid-cols-2 gap-2 border-t bg-pw-paper/70 p-3 backdrop-blur-sm sm:grid-cols-3 sm:px-8 lg:grid-cols-6">
          <Stat label="HP">{formatNumber(pal.stats.hp)}</Stat>
          <Stat label="Attack">{formatNumber(pal.stats.attack)}</Stat>
          <Stat label="Defense">{formatNumber(pal.stats.defense)}</Stat>
          <Stat label="Breeding rank">{pal.breeding.rank}</Stat>
          <Stat label="Size">{pal.size || '–'}</Stat>
          <Stat label="Sells for">{formatNumber(pal.sellPrice)}</Stat>
        </dl>
        <div className="relative grid grid-cols-2 divide-x border-t text-sm font-semibold">
          {prev ? (
            <Link
              to={`/pal/${prev.id}${search}`}
              className="flex items-center gap-2 truncate px-4 py-2.5 hover:bg-pw-cream/60"
            >
              <PalImage pal={prev} className="size-7 shrink-0" />
              <span className="truncate">
                <span className="text-pw-muted">← #{prev.number}</span>{' '}
                {prev.name}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              to={`/pal/${next.id}${search}`}
              className="flex items-center justify-end gap-2 truncate px-4 py-2.5 hover:bg-pw-cream/60"
            >
              <span className="truncate">
                {next.name}{' '}
                <span className="text-pw-muted">#{next.number} →</span>
              </span>
              <PalImage pal={next} className="size-7 shrink-0" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </section>

      <Toolbar className="mt-5">
        <div
          className="-m-1.5 flex gap-2 overflow-x-auto p-1.5"
          role="group"
          aria-label="Sections of this page"
        >
          {TABS.map((t) => (
            <Chip
              key={t.id}
              active={tab === t.id}
              onClick={() => setTab(t.id)}
              className="shrink-0"
            >
              {t.label}
            </Chip>
          ))}
        </div>
      </Toolbar>

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
            <Stat label="Stamina">{formatNumber(stats.stamina)}</Stat>
            <Stat label="Walk / run">
              {formatNumber(stats.walk)} / {formatNumber(stats.run)}
            </Stat>
            <Stat label="Ride sprint">{formatNumber(stats.rideSprint)}</Stat>
            <Stat label="Swim">{formatNumber(stats.swim)}</Stat>
            <Stat label="Transport">{formatNumber(stats.transport)}</Stat>
            <Stat label="Capture rate">
              {formatNumber(stats.captureRate, 2)}×
            </Stat>
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
              <p className="text-xs font-semibold tracking-wide text-pw-link uppercase">
                {pal.partnerSkill.type}
              </p>
              <p className="mt-2 whitespace-pre-line text-pw-muted">
                {pal.partnerSkill.description}
              </p>
            </Panel>
          )}
        </div>
      </div>

      <Panel title="Element matchups">
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
                  defence[e] > 1 && 'text-red-600 dark:text-red-300',
                  defence[e] < 1 && 'text-pw-link'
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
          <Stat label="Size">{pal.size || '–'}</Stat>
          <Stat label="Food">{pal.hunger ?? '–'}</Stat>
          <Stat label="Sell price">{formatNumber(pal.sellPrice)}</Stat>
          <Stat label="EXP ratio">{formatNumber(stats.expRatio, 2)}×</Stat>
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
          <ul className="grid-fluid [--min:17rem]">
            {pal.activeSkills.map((s) => {
              const info = skillByName.get(s.name);
              const colour = info ? elementColours[info.element] : undefined;
              const body = (
                <>
                  {colour && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-1"
                      style={{ backgroundColor: colour }}
                    />
                  )}
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-display text-xl leading-tight font-bold">
                      {s.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-pw-navy px-2.5 py-0.5 text-xs font-semibold text-white">
                      Lv. {s.level}
                    </span>
                  </span>
                  {info && (
                    <>
                      <span className="line-clamp-2 flex-1 text-sm text-pw-muted">
                        {info.description}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                        <ElementBadge
                          element={info.element}
                          linked={false}
                          size="sm"
                        />
                        <span className="rounded-full bg-pw-cream px-2.5 py-1">
                          Power {info.power ?? '–'}
                        </span>
                        <span className="rounded-full bg-pw-cream px-2.5 py-1">
                          {info.cooldown ?? '–'}s
                        </span>
                      </span>
                    </>
                  )}
                </>
              );
              const cls =
                'card relative flex h-full flex-col gap-2 overflow-hidden p-4 pt-5';
              return (
                <li key={`${s.name}-${s.level}`}>
                  {info ? (
                    <Link
                      to={`/skill/${info.id}`}
                      className={cn(cls, 'card-link')}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className={cls}>{body}</div>
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
          <ul className="grid-fluid [--min:17rem]">
            {pal.passiveSkills.map((name) => (
              <li key={name}>
                <Link
                  to={`/passives#${passiveByName.get(name)?.id ?? ''}`}
                  className="flex h-full card-link flex-col gap-1 card bg-pw-cream/40 p-4"
                >
                  <span className="font-display text-xl font-bold">{name}</span>
                  <span className="text-sm text-pw-muted">
                    {passiveByName.get(name)?.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function BreedingTab({ pal }: { pal: Pal }) {
  const parents = React.useMemo(() => breeder.parentsOf(pal), [pal]);
  const [text, setText] = React.useState('');
  const [how, setHow] = React.useState('');
  const shown = React.useMemo(
    () => filterPairs(parents, { text, method: how }),
    [parents, text, how]
  );

  return (
    <>
      <Panel title="Breeding">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Breeding rank">{pal.breeding.rank}</Stat>
          <Stat label="Egg">{pal.breeding.egg || '–'}</Stat>
          <Stat label="Male chance">
            {pal.breeding.maleProbability ?? '–'}%
          </Stat>
          <Stat label="Tie-break priority">
            {formatNumber(pal.breeding.priority)}
          </Stat>
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
            to={`/breeding?mode=find&c=${pal.id}`}
            className="text-sm font-semibold text-pw-link hover:underline"
          >
            Open in the calculator
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
            <div className="mb-4 space-y-2">
              <SearchInput
                value={text}
                onChange={setText}
                placeholder="Filter by a parent’s name"
              />
              <MethodChips pairs={parents} value={how} onChange={setHow} />
            </div>
            <ParentPairList
              pairs={shown}
              resetKey={`${pal.id}|${text}|${how}`}
            />
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
    <ul className="grid-fluid [--min:9rem]">
      {drops.map((d) => (
        <li key={d.item}>
          <Tile
            to={
              linkableDrops.has(d.item) ? `/item/${slugify(d.item)}` : undefined
            }
            icon={
              <ItemIcon
                id={slugify(d.item)}
                name={d.item}
                className="size-14"
              />
            }
            title={d.item}
            meta={
              <>
                {d.min === d.max ? `×${d.min}` : `×${d.min}–${d.max}`}
                <span className="mx-1">·</span>
                <b className="text-pw-ink">{d.chance}%</b>
              </>
            }
            className="h-full"
          />
        </li>
      ))}
    </ul>
  );
}

function DropsTab({ pal }: { pal: Pal }) {
  return (
    <>
      <Panel title="Drops">
        <DropList drops={pal.drops} />
      </Panel>
      <Panel title="Alpha drops">
        <DropList drops={pal.alphaDrops} />
      </Panel>
    </>
  );
}
