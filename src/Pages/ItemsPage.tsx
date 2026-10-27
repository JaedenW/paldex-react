import React from 'react';
import { Link } from 'react-router';
import ItemIcon from '../Components/ItemIcon';
import InfiniteSentinel from '../Components/InfiniteSentinel';
import { useInfiniteScroll } from '../Hooks/useInfiniteScroll';
import { RarityBadge } from '../Components/gearUi';
import {
  EmptyState,
  Page,
  PageHeader,
  SearchInput,
  Select,
  buttonClass,
} from '../Components/ui';
import { items } from '../data/gear';
import { useQueryState } from '../Hooks/useQueryState';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { RARITIES, rarityRank } from '../Utils/rarity';
import { normalise } from '../Utils/text';
import type { Item } from '../types';
import { cn } from '../Utils/cn';

const SORTS = {
  name: (a: Item, b: Item) => a.name.localeCompare(b.name),
  rarity: (a: Item, b: Item) =>
    rarityRank(b.rarity) - rarityRank(a.rarity) || a.name.localeCompare(b.name),
  sell: (a: Item, b: Item) => (b.sell ?? 0) - (a.sell ?? 0),
  weight: (a: Item, b: Item) => (b.weight ?? 0) - (a.weight ?? 0),
};

const PAGE_SIZE = 96;
// 400+ near-identical upgrade schematics would bury everything else
const HIDDEN_BY_DEFAULT = 'Schematic';

const types = [...new Set(items.map((i) => i.type))].sort();

export default function ItemsPage() {
  useDocumentTitle('Items');
  const [query, setQuery] = useQueryState('q');
  const [type, setType] = useQueryState('type');
  const [rarity, setRarity] = useQueryState('rarity');
  const [sort, setSort] = useQueryState('sort', 'name');

  const list = React.useMemo(() => {
    const q = normalise(query.trim());
    return items
      .filter((i) =>
        type ? i.type === type : i.type !== HIDDEN_BY_DEFAULT || !!q
      )
      .filter((i) => !rarity || i.rarity === rarity)
      .filter(
        (i) =>
          !q ||
          normalise(i.name).includes(q) ||
          normalise(i.subtype ?? '').includes(q)
      )
      .sort(SORTS[sort as keyof typeof SORTS] ?? SORTS.name);
  }, [query, type, rarity, sort]);

  const { limit, hasMore, sentinelRef, showAll } = useInfiniteScroll(
    list.length,
    PAGE_SIZE,
    [query, type, rarity, sort].join('|')
  );

  return (
    <Page wide>
      <PageHeader
        title="Items"
        subtitle={`${items.length} items: weapons, armor, materials, food and more. Open one to see how to craft it and where it drops.`}
      >
        <Link to="/crafting" className={buttonClass('accent')}>
          Crafting calculator
        </Link>
      </PageHeader>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search items"
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
        <Select
          label="Rarity"
          value={rarity}
          onChange={setRarity}
          options={[
            { value: '', label: 'Any rarity' },
            ...RARITIES.map((r) => ({ value: r as string, label: r })),
          ]}
        />
        <Select
          label="Sort by"
          value={sort as keyof typeof SORTS}
          onChange={setSort}
          options={[
            { value: 'name', label: 'Sort: Name' },
            { value: 'rarity', label: 'Sort: Rarity' },
            { value: 'sell', label: 'Sort: Sell value' },
            { value: 'weight', label: 'Sort: Weight' },
          ]}
        />
      </div>

      <p className="mb-3 text-sm text-pw-muted" aria-live="polite">
        {list.length} item{list.length === 1 ? '' : 's'}
        {!type &&
          !query &&
          ' (schematics are hidden; pick the Schematic type to see them)'}
      </p>

      {list.length === 0 ? (
        <EmptyState title="No items match">Try removing a filter.</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {list.slice(0, limit).map((i) => (
              <Link
                key={i.id}
                to={`/item/${i.id}`}
                className="flex flex-col items-center gap-1.5 rounded-2xl border bg-pw-paper p-3 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                {i.type === HIDDEN_BY_DEFAULT ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-16 items-center justify-center rounded-lg bg-pw-cream font-display text-2xl font-bold text-pw-muted'
                    )}
                  >
                    S
                  </span>
                ) : (
                  <ItemIcon
                    id={i.id}
                    name={i.name}
                    rarity={i.rarity}
                    className="size-16"
                  />
                )}
                <p className="line-clamp-2 font-display text-lg leading-tight font-bold">
                  {i.name}
                </p>
                <p className="text-xs text-pw-muted">{i.subtype ?? i.type}</p>
                <RarityBadge rarity={i.rarity} />
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
