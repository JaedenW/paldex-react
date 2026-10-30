import React from 'react';
import { SearchInput, ShowMoreBar } from './ui';
import { useShowMore } from '../Hooks/useShowMore';
import { normalise } from '../Utils/text';

/**
 * A grid for lists that can run to hundreds of entries: it starts with a short
 * page, has a "Show more" button, and offers a filter box once the list is long
 * enough to need one. Pass `toolbar` for extra filter chips; the caller applies
 * those to `items` and the box here narrows the result by name.
 */
export default function LongList<T>({
  items,
  itemKey,
  renderItem,
  text,
  noun,
  min = '15rem',
  first = 12,
  step = 24,
  filterFrom = 12,
  toolbar,
  resetKey = '',
  className,
}: {
  items: T[];
  itemKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  /** What the filter box searches in each item; no box when omitted */
  text?: (item: T) => string;
  /** What the entries are, for the filter box and messages: "Pals", "recipes" */
  noun: string;
  /** Smallest column width, any CSS length */
  min?: string;
  first?: number;
  step?: number;
  /** Show the filter box once there are more entries than this */
  filterFrom?: number;
  toolbar?: React.ReactNode;
  /** Changing this starts the list over from the first page */
  resetKey?: string;
  className?: string;
}) {
  const [q, setQ] = React.useState('');
  const query = normalise(q.trim());
  const filtered = React.useMemo(
    () =>
      query && text
        ? items.filter((i) => normalise(text(i)).includes(query))
        : items,
    [items, text, query]
  );
  const { shown, next, showMore } = useShowMore(
    filtered.length,
    first,
    step,
    `${resetKey}|${query}`
  );
  const showFilter = !!text && items.length > filterFrom;

  return (
    <div className={className}>
      {(showFilter || toolbar) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 empty:hidden">
          {showFilter && (
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder={`Filter ${noun}`}
            />
          )}
          {toolbar}
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-pw-muted">
          {query ? `No ${noun} match “${q.trim()}”.` : `No ${noun}.`}
        </p>
      ) : (
        <>
          <ul
            className="grid-fluid"
            style={{ '--min': min } as React.CSSProperties}
          >
            {filtered.slice(0, shown).map((item) => (
              <li key={itemKey(item)}>{renderItem(item)}</li>
            ))}
          </ul>
          {filtered.length > first && (
            <ShowMoreBar
              shown={shown}
              total={filtered.length}
              next={next}
              onShowMore={showMore}
            />
          )}
        </>
      )}
    </div>
  );
}
