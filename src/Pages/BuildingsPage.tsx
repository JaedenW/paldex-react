import React from 'react';
import { Link } from 'react-router';
import ItemIcon from '../Components/ItemIcon';
import Tile from '../Components/Tile';
import InfiniteSentinel from '../Components/InfiniteSentinel';
import { useInfiniteScroll } from '../Hooks/useInfiniteScroll';
import {
  EmptyState,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Toolbar,
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
    <Page>
      <PageHeader
        eyebrow="Items & Base"
        title="Buildings"
        subtitle={`${buildings.length} structures to build at your base: foundations, production, storage, defence and decor.`}
      >
        <Link to="/crafting" className={buttonClass('accent')}>
          Crafting calculator
        </Link>
      </PageHeader>
      <Toolbar>
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
        <span
          className="ml-auto hidden text-sm text-pw-muted sm:inline"
          aria-live="polite"
        >
          {list.length} building{list.length === 1 ? '' : 's'}
        </span>
      </Toolbar>
      {list.length === 0 ? (
        <EmptyState title="No buildings match">
          Try removing a filter.
        </EmptyState>
      ) : (
        <>
          <div className="grid-fluid [--min:9.5rem]">
            {list.slice(0, limit).map((b) => (
              <Tile
                key={b.id}
                to={`/building/${b.id}`}
                icon={
                  <ItemIcon
                    kind="building"
                    id={b.id}
                    name={b.name}
                    className="size-14"
                  />
                }
                title={b.name}
                meta={[b.type, b.subtype].filter(Boolean).join(' · ')}
              />
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
