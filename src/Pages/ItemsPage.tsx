import React from 'react';
import { Link } from 'react-router';
import ItemIcon from '../Components/ItemIcon';
import Tile from '../Components/Tile';
import InfiniteSentinel from '../Components/InfiniteSentinel';
import { useInfiniteScroll } from '../Hooks/useInfiniteScroll';
import { RarityBadge } from '../Components/gearUi';
import {
  EmptyState,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Toolbar,
  buttonClass,
} from '../Components/ui';
import { items } from '../data/gear';
import { useQueryState } from '../Hooks/useQueryState';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { RARITIES, rarityColours, rarityRank } from '../Utils/rarity';
import { normalise } from '../Utils/text';
import type { Item } from '../types';

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
    <Page>
      <PageHeader
        eyebrow="Items & Base"
        title="Items"
        subtitle={`${items.length.toLocaleString()} items: weapons, armor, materials, food and more. Open one to see how to craft it and where it drops.`}
      >
        <Link to="/crafting" className={buttonClass('accent')}>
          Crafting calculator
        </Link>
      </PageHeader>

      <Toolbar>
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
        <span
          className="ml-auto hidden text-sm text-pw-muted sm:inline"
          aria-live="polite"
        >
          {list.length.toLocaleString()} item{list.length === 1 ? '' : 's'}
        </span>
      </Toolbar>
      {!type && !query && (
        <p className="-mt-1 mb-3 text-xs text-pw-muted">
          Upgrade schematics are hidden. Pick the Schematic type to see them.
        </p>
      )}

      {list.length === 0 ? (
        <EmptyState title="No items match">Try removing a filter.</EmptyState>
      ) : (
        <>
          <div className="grid-fluid [--min:9.5rem]">
            {list.slice(0, limit).map((i) => (
              <Tile
                key={i.id}
                to={`/item/${i.id}`}
                accent={i.rarity ? rarityColours[i.rarity] : undefined}
                icon={
                  i.type === HIDDEN_BY_DEFAULT ? (
                    <span
                      aria-hidden="true"
                      className="font-display text-3xl font-bold text-pw-muted"
                    >
                      S
                    </span>
                  ) : (
                    <ItemIcon
                      id={i.id}
                      name={i.name}
                      rarity={i.rarity}
                      className="size-14"
                    />
                  )
                }
                title={i.name}
                meta={i.subtype ?? i.type}
                badge={<RarityBadge rarity={i.rarity} />}
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
