import React from 'react';
import { Link, useSearchParams } from 'react-router';
import { ResultPanel, TraitsPanel } from '../Components/BreedingParts';
import PalImage from '../Components/PalImage';
import PalPicker from '../Components/PalPicker';
import TraitPicker, { type TraitOption } from '../Components/TraitPicker';
import InfiniteSentinel from '../Components/InfiniteSentinel';
import {
  Chip,
  EmptyState,
  Page,
  PageHeader,
  Panel,
  buttonClass,
} from '../Components/ui';
import {
  activeSkills,
  breeder,
  palById,
  passiveByName,
  passiveById,
  passiveSkills,
} from '../data';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { useInfiniteScroll } from '../Hooks/useInfiniteScroll';
import { METHOD_LABELS } from '../Utils/breedingText';
import type { BreedMethod } from '../Utils/breeding';
import type { Pal } from '../types';
import { cn } from '../Utils/cn';

const MAX_PARENT_PASSIVES = 4;
const MAX_PARENT_SKILLS = 8;

/** A list kept in the URL. `-` means deliberately empty, as opposed to not chosen yet. */
const readList = (value: string | null): string[] | undefined =>
  value === null
    ? undefined
    : value === '-'
      ? []
      : value.split(',').filter(Boolean);
const writeList = (ids: string[]) => (ids.length ? ids.join(',') : '-');

const passiveOptions: TraitOption[] = passiveSkills.map((p) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  tone:
    p.rank == null
      ? 'plain'
      : p.rank > 0
        ? 'good'
        : p.rank < 0
          ? 'bad'
          : 'plain',
  detail: p.rank == null ? undefined : `Rank ${p.rank}`,
}));

// Exclusive skills can't be passed down, so only inheritable ones are offered
const inheritable = activeSkills.filter((s) => s.inheritable);

const skillOptionsFor = (pal: Pal | undefined): TraitOption[] => {
  const own = new Map((pal?.activeSkills ?? []).map((s) => [s.name, s.level]));
  return inheritable.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    detail: own.has(s.name)
      ? `${s.element} · learned at Lv. ${own.get(s.name)}`
      : s.element,
    boost: own.has(s.name) ? 1 : 0,
  }));
};

const innatePassives = (pal: Pal | undefined) =>
  (pal?.passiveSkills ?? [])
    .map((n) => passiveByName.get(n)?.id)
    .filter((x): x is string => !!x);

export default function BreedingPage() {
  useDocumentTitle('Breeding calculator');
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'find' ? 'find' : 'calc';

  /** Changes several URL values at once; an empty value removes the key */
  const patch = React.useCallback(
    (changes: Record<string, string | undefined>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(changes)) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  return (
    <Page>
      <PageHeader
        title="Breeding calculator"
        subtitle="Work out what two parents hatch, how likely each trait is to be passed down, or find which parents make the Pal you want. Everything is kept in the link, so you can share a result."
      />
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Calculator mode"
      >
        <Chip
          role="tab"
          aria-selected={mode === 'calc'}
          active={mode === 'calc'}
          onClick={() => patch({ mode: undefined })}
        >
          Parents → offspring
        </Chip>
        <Chip
          role="tab"
          aria-selected={mode === 'find'}
          active={mode === 'find'}
          onClick={() => patch({ mode: 'find' })}
        >
          Find parents for a Pal
        </Chip>
      </div>
      {mode === 'calc' ? (
        <Calculator params={params} patch={patch} />
      ) : (
        <FindParents params={params} patch={patch} />
      )}
    </Page>
  );
}

type Patch = (changes: Record<string, string | undefined>) => void;

function Calculator({
  params,
  patch,
}: {
  params: URLSearchParams;
  patch: Patch;
}) {
  const a = palById.get(params.get('a') ?? '');
  const b = palById.get(params.get('b') ?? '');

  // A parent starts with the passives its species always has; picking some replaces that.
  // Ids that don't exist (from an edited link) are dropped.
  const validPassives = (ids: string[]) =>
    ids.filter((id) => passiveById.has(id));
  const validSkills = (ids: string[]) =>
    ids.filter((id) => inheritable.some((s) => s.id === id));
  const passivesA = validPassives(
    readList(params.get('pa')) ?? innatePassives(a)
  );
  const passivesB = validPassives(
    readList(params.get('pb')) ?? innatePassives(b)
  );
  const skillsA = validSkills(readList(params.get('sa')) ?? []);
  const skillsB = validSkills(readList(params.get('sb')) ?? []);

  const pool = React.useMemo(
    () =>
      [...new Set([...passivesA, ...passivesB])]
        .map((id) => passiveById.get(id)!)
        .filter(Boolean),
    [passivesA, passivesB]
  );
  const skillPool = React.useMemo(() => {
    const ids = [...new Set([...skillsA, ...skillsB])];
    return ids
      .map((id) => inheritable.find((s) => s.id === id)!)
      .filter(Boolean);
  }, [skillsA, skillsB]);
  const wanted = (readList(params.get('want')) ?? []).filter((id) =>
    pool.some((p) => p.id === id)
  );

  const result = React.useMemo(
    () => (a && b ? breeder.explain(a, b) : undefined),
    [a, b]
  );

  const swap = () =>
    patch({
      a: b?.id,
      b: a?.id,
      pa: params.get('pb') ?? undefined,
      pb: params.get('pa') ?? undefined,
      sa: params.get('sb') ?? undefined,
      sb: params.get('sa') ?? undefined,
    });

  // Changing a parent drops the traits that came with the old one
  const setParent = (side: 'a' | 'b') => (id: string) =>
    patch({
      [side]: id || undefined,
      [side === 'a' ? 'pa' : 'pb']: undefined,
      [side === 'a' ? 'sa' : 'sb']: undefined,
      want: undefined,
    });

  const toggleWanted = (id: string) =>
    patch({
      want: writeList(
        wanted.includes(id) ? wanted.filter((x) => x !== id) : [...wanted, id]
      ),
    });

  const parentTraits = (side: 'a' | 'b', pal: Pal) => {
    const passives = side === 'a' ? passivesA : passivesB;
    const skills = side === 'a' ? skillsA : skillsB;
    return (
      <div className="mt-4 space-y-4 border-t pt-4">
        <TraitPicker
          label="Passive skills"
          options={passiveOptions}
          selected={passives}
          max={MAX_PARENT_PASSIVES}
          placeholder="Add a passive skill…"
          onChange={(ids) =>
            patch({
              [side === 'a' ? 'pa' : 'pb']: writeList(ids),
              want: undefined,
            })
          }
        />
        <TraitPicker
          label="Active skills it knows"
          options={skillOptionsFor(pal)}
          selected={skills}
          max={MAX_PARENT_SKILLS}
          placeholder="Add an active skill…"
          onChange={(ids) =>
            patch({ [side === 'a' ? 'sa' : 'sb']: writeList(ids) })
          }
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Panel>
        <div className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
          <PalPicker
            label="Parent 1"
            value={a?.id ?? ''}
            onChange={setParent('a')}
          >
            {a && parentTraits('a', a)}
          </PalPicker>
          <div className="flex items-center justify-center gap-2 md:flex-col md:pt-24">
            <span className="font-display text-4xl font-bold text-pw-sun">
              +
            </span>
            <button
              type="button"
              onClick={swap}
              disabled={!a && !b}
              aria-label="Swap the parents"
              className={buttonClass('secondary', 'h-9')}
            >
              ⇄ Swap
            </button>
          </div>
          <PalPicker
            label="Parent 2"
            value={b?.id ?? ''}
            onChange={setParent('b')}
          >
            {b && parentTraits('b', b)}
          </PalPicker>
        </div>
      </Panel>

      {result && a && b ? (
        <>
          <ResultPanel a={a} b={b} result={result} />
          <TraitsPanel
            passives={pool}
            wanted={wanted}
            onToggleWanted={toggleWanted}
            skills={skillPool}
          />
        </>
      ) : (
        <EmptyState title="Choose two parents">
          Search for each parent above by name or Paldeck number. Their usual
          passive skills are filled in for you, and you can change them.
        </EmptyState>
      )}
    </div>
  );
}

const METHOD_FILTERS: BreedMethod[] = ['listed', 'rank', 'same', 'gender'];

function FindParents({
  params,
  patch,
}: {
  params: URLSearchParams;
  patch: Patch;
}) {
  const child = palById.get(params.get('c') ?? '');
  const withPal = palById.get(params.get('with') ?? '');
  const methodParam = params.get('how') ?? '';

  const all = React.useMemo(
    () => (child ? breeder.parentsOf(child) : []),
    [child]
  );
  const shown = React.useMemo(
    () =>
      all.filter(
        (p) =>
          (!withPal || p.a.id === withPal.id || p.b.id === withPal.id) &&
          (!methodParam || p.method === methodParam)
      ),
    [all, withPal, methodParam]
  );
  const { limit, hasMore, sentinelRef, showAll } = useInfiniteScroll(
    shown.length,
    30,
    `${child?.id}|${withPal?.id}|${methodParam}`
  );

  const counts = React.useMemo(() => {
    const c: Partial<Record<BreedMethod, number>> = {};
    for (const p of all) c[p.method] = (c[p.method] ?? 0) + 1;
    return c;
  }, [all]);

  return (
    <div className="space-y-4">
      <Panel>
        <div className="grid gap-4 md:grid-cols-2">
          <PalPicker
            label="Pal you want"
            value={child?.id ?? ''}
            onChange={(id) =>
              patch({ c: id || undefined, with: undefined, how: undefined })
            }
          />
          <PalPicker
            label="Must include (optional)"
            value={withPal?.id ?? ''}
            onChange={(id) => patch({ with: id || undefined })}
          />
        </div>
      </Panel>

      {!child ? (
        <EmptyState title="Choose the Pal you want to breed">
          You’ll get every pair of parents that produces it.
        </EmptyState>
      ) : all.length === 0 ? (
        <EmptyState title={`No parents make ${child.name}`}>
          It can’t be bred, so it has to be found in the wild or summoned.
        </EmptyState>
      ) : (
        <Panel
          title={`${shown.length} pair${shown.length === 1 ? '' : 's'} make ${child.name}`}
          actions={
            <div className="flex flex-wrap gap-1.5">
              <Chip
                active={!methodParam}
                onClick={() => patch({ how: undefined })}
              >
                All ({all.length})
              </Chip>
              {METHOD_FILTERS.filter((m) => counts[m]).map((m) => (
                <Chip
                  key={m}
                  active={methodParam === m}
                  onClick={() => patch({ how: m })}
                >
                  {METHOD_LABELS[m]} ({counts[m]})
                </Chip>
              ))}
            </div>
          }
        >
          {shown.length === 0 ? (
            <p className="text-pw-muted">No pair matches those filters.</p>
          ) : (
            <>
              <ul className="divide-y">
                {shown.slice(0, limit).map(({ a, b, method }) => (
                  <li
                    key={`${a.id}|${b.id}`}
                    className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 py-2"
                  >
                    <ParentLink pal={a} highlight={a.id === withPal?.id} />
                    <span
                      className="font-bold text-pw-sun"
                      title={METHOD_LABELS[method]}
                    >
                      +
                    </span>
                    <ParentLink pal={b} highlight={b.id === withPal?.id} />
                    <Link
                      to={`/breeding?a=${a.id}&b=${b.id}`}
                      className="rounded-full px-3 py-1 text-sm font-semibold text-pw-teal-dark hover:bg-pw-cream"
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
              <InfiniteSentinel
                sentinelRef={sentinelRef}
                hasMore={hasMore}
                showAll={showAll}
              />
            </>
          )}
        </Panel>
      )}
    </div>
  );
}

function ParentLink({ pal, highlight }: { pal: Pal; highlight?: boolean }) {
  return (
    <Link
      to={`/pal/${pal.id}`}
      className={cn(
        'flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-pw-cream',
        highlight && 'bg-pw-sun/20'
      )}
    >
      <PalImage pal={pal} className="size-9 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{pal.name}</span>
        <span className="block text-xs text-pw-muted">
          rank {pal.breeding.rank}
        </span>
      </span>
    </Link>
  );
}
