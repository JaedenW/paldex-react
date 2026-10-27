import React from 'react';
import PalCard from '../Components/PalCard';
import InfiniteSentinel from '../Components/InfiniteSentinel';
import { useInfiniteScroll } from '../Hooks/useInfiniteScroll';
import ElementBadge from '../Components/ElementBadge';
import {
  Chip,
  EmptyState,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Toolbar,
  buttonClass,
  ChipRow,
} from '../Components/ui';
import { GridIcon, ListIcon } from '../Components/Icons';
import { pals } from '../data';
import { useQueryPatch, useQueryState } from '../Hooks/useQueryState';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { ELEMENTS } from '../Utils/elements';
import { WORK_TYPES } from '../Utils/work';
import { compareNumbers, normalise } from '../Utils/text';
import type { Element, Pal, WorkType } from '../types';
import { cn } from '../Utils/cn';

const SORTS = {
  number: {
    label: 'Paldeck number',
    cmp: (a: Pal, b: Pal) => compareNumbers(a.number, b.number),
  },
  name: {
    label: 'Name',
    cmp: (a: Pal, b: Pal) => a.name.localeCompare(b.name),
  },
  hp: {
    label: 'HP',
    cmp: (a: Pal, b: Pal) => (b.stats.hp ?? 0) - (a.stats.hp ?? 0),
  },
  attack: {
    label: 'Attack',
    cmp: (a: Pal, b: Pal) => (b.stats.attack ?? 0) - (a.stats.attack ?? 0),
  },
  defense: {
    label: 'Defense',
    cmp: (a: Pal, b: Pal) => (b.stats.defense ?? 0) - (a.stats.defense ?? 0),
  },
  price: {
    label: 'Sell price',
    cmp: (a: Pal, b: Pal) => (b.sellPrice ?? 0) - (a.sellPrice ?? 0),
  },
} as const;
type SortKey = keyof typeof SORTS;

const PAGE_SIZE = 72;

export default function PaldexPage() {
  useDocumentTitle();
  const [query, setQuery] = useQueryState('q');
  const [elementParam, setElementParam] = useQueryState('el');
  const [work, setWork] = useQueryState('work');
  const [sort, setSort] = useQueryState('sort', 'number');
  const [view, setView] = useQueryState('view', 'grid');
  const [variants, setVariants] = useQueryState('variants', 'show');

  const selected = elementParam
    .split(',')
    .filter((e): e is Element => ELEMENTS.includes(e as Element));
  const toggleElement = (e: Element) =>
    setElementParam(
      (selected.includes(e)
        ? selected.filter((x) => x !== e)
        : [...selected, e]
      ).join(',')
    );

  const filtered = React.useMemo(() => {
    const q = normalise(query.trim()).replace(/^#/, '');
    return pals
      .filter(
        (p) =>
          !q ||
          normalise(p.name).includes(q) ||
          p.number.toLowerCase().startsWith(q)
      )
      .filter((p) => selected.every((e) => p.elements.includes(e)))
      .filter((p) => !work || (p.work[work as WorkType] ?? 0) > 0)
      .filter((p) => variants === 'show' || !/[A-Z]$/.test(p.number))
      .sort(
        work && sort === 'number'
          ? SORTS.number.cmp
          : (SORTS[sort as SortKey] ?? SORTS.number).cmp
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, elementParam, work, sort, variants]);

  const { limit, hasMore, sentinelRef, showAll } = useInfiniteScroll(
    filtered.length,
    PAGE_SIZE,
    [query, elementParam, work, sort, variants].join('|')
  );
  const compact = view === 'list';
  const anyFilter = !!(
    query ||
    elementParam ||
    work ||
    variants !== 'show' ||
    sort !== 'number'
  );
  const patch = useQueryPatch();

  return (
    <Page>
      <PageHeader
        eyebrow="Pals"
        title="Paldex"
        subtitle={`${pals.length} Pals, from the community-maintained Palworld wiki. Filter by element or work suitability.`}
      />

      <Toolbar stickyOnPhones={false}>
        {/* on phones: search with the view switch beside it, filters on the next row */}
        <div className="flex w-full items-center gap-2 lg:contents">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by name or number"
            className="flex-1 sm:max-w-xs sm:flex-none"
          />
          <div
            className="flex shrink-0 gap-1 lg:order-2 lg:ml-auto"
            role="group"
            aria-label="Card size"
          >
            <button
              type="button"
              aria-label="Large cards"
              aria-pressed={!compact}
              onClick={() => setView('grid')}
              className={buttonClass(
                compact ? 'secondary' : 'primary',
                'w-10 px-0!'
              )}
            >
              <GridIcon className="size-6" />
            </button>
            <button
              type="button"
              aria-label="Compact cards"
              aria-pressed={compact}
              onClick={() => setView('list')}
              className={buttonClass(
                compact ? 'primary' : 'secondary',
                'w-10 px-0!'
              )}
            >
              <ListIcon className="size-6" />
            </button>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:contents">
          <Select
            label="Sort by"
            value={sort as SortKey}
            onChange={setSort}
            options={Object.entries(SORTS).map(([value, s]) => ({
              value: value as SortKey,
              label: `Sort: ${s.label}`,
            }))}
          />
          <Select
            label="Work suitability"
            value={work}
            onChange={setWork}
            options={[
              { value: '', label: 'Any work' },
              ...WORK_TYPES.map((w) => ({ value: w as string, label: w })),
            ]}
          />
          <Chip
            active={variants === 'hide'}
            onClick={() => setVariants(variants === 'hide' ? 'show' : 'hide')}
          >
            Hide variants
          </Chip>
        </div>
        <ChipRow label="Elements" className="lg:order-3">
          {ELEMENTS.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={selected.includes(e)}
              onClick={() => toggleElement(e)}
              className={cn(
                'shrink-0 rounded-full transition',
                selected.length > 0 &&
                  !selected.includes(e) &&
                  'opacity-40 hover:opacity-80'
              )}
            >
              <ElementBadge element={e} linked={false} />
            </button>
          ))}
        </ChipRow>
      </Toolbar>

      <div className="-mt-1 mb-3 flex min-h-6 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-pw-muted" aria-live="polite">
          {filtered.length === pals.length
            ? `${pals.length} Pals`
            : `${filtered.length} of ${pals.length} Pals`}
        </p>
        {anyFilter && (
          <button
            type="button"
            onClick={() =>
              patch({
                q: undefined,
                el: undefined,
                work: undefined,
                sort: undefined,
                variants: undefined,
              })
            }
            className="text-sm font-semibold text-pw-link hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No Pals match">Try removing a filter.</EmptyState>
      ) : (
        <>
          <div
            className={cn(
              'grid-fluid',
              compact ? '[--min:15rem]' : '[--min:9.5rem]'
            )}
          >
            {filtered.slice(0, limit).map((p) => (
              <PalCard key={p.id} pal={p} compact={compact} />
            ))}
          </div>
          <InfiniteSentinel
            sentinelRef={sentinelRef}
            hasMore={hasMore}
            showAll={showAll}
          />
        </>
      )}
    </Page>
  );
}
