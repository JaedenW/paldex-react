import React from 'react';
import { Link } from 'react-router';
import ItemIcon from '../Components/ItemIcon';
import InfiniteSentinel from '../Components/InfiniteSentinel';
import { useInfiniteScroll } from '../Hooks/useInfiniteScroll';
import {
  EmptyState,
  Page,
  PageHeader,
  SearchInput,
  Select,
  buttonClass,
} from '../Components/ui';
import { buildings } from '../data/gear';
import { useQueryState } from '../Hooks/useQueryState';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { normalise } from '../Utils/text';

const PAGE_SIZE = 96;
const types = [
  ...new Set(buildings.map((b) => b.type).filter((t): t is string => !!t)),
].sort();

export default function BuildingsPage() {
  useDocumentTitle('Buildings');
  const [query, setQuery] = useQueryState('q');
  const [type, setType] = useQueryState('type');

  const list = React.useMemo(() => {
    const q = normalise(query.trim());
    return buildings
      .filter((b) => !type || b.type === type)
      .filter(
        (b) =>
          !q ||
          normalise(b.name).includes(q) ||
          normalise(b.subtype ?? '').includes(q)
      );
  }, [query, type]);
  const { limit, hasMore, sentinelRef, showAll } = useInfiniteScroll(
    list.length,
    PAGE_SIZE,
    [query, type].join('|')
  );

  return (
    <Page wide>
      <PageHeader
        title="Buildings"
        subtitle={`${buildings.length} structures to build at your base: foundations, production, storage, defence and decor.`}
      >
        <Link to="/crafting" className={buttonClass('accent')}>
          Crafting calculator
        </Link>
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search buildings"
        />
        <Select
          label="Type"
          value={type}
          onChange={setType}
          options={[
            { value: '', label: 'All types' },
            ...types.map((t) => ({ value: t, label: t })),
          ]}
        />
      </div>
      <p className="mb-3 text-sm text-pw-muted" aria-live="polite">
        {list.length} building{list.length === 1 ? '' : 's'}
      </p>
      {list.length === 0 ? (
        <EmptyState title="No buildings match">
          Try removing a filter.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {list.slice(0, limit).map((b) => (
              <Link
                key={b.id}
                to={`/building/${b.id}`}
                className="flex flex-col items-center gap-1.5 rounded-2xl border bg-pw-paper p-3 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <ItemIcon
                  kind="building"
                  id={b.id}
                  name={b.name}
                  className="size-16"
                />
                <p className="line-clamp-2 font-display text-lg leading-tight font-bold">
                  {b.name}
                </p>
                <p className="text-xs text-pw-muted">
                  {[b.type, b.subtype].filter(Boolean).join(' · ')}
                </p>
              </Link>
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
