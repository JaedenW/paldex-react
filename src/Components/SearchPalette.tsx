import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { useSearch } from '../Utils/SearchContext';
import { searchScored, topResults } from '../Utils/search';
import { SearchIcon } from './Icons';
import { cn } from '../Utils/cn';

export default function SearchPalette() {
  const { open, closeSearch } = useSearch();
  if (!open) return null;
  return createPortal(<Palette onClose={closeSearch} />, document.body);
}

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');
  const [index, setIndex] = React.useState(0);
  // item, building and tech data is large, so it loads when the palette first opens
  const [gearSearch, setGearSearch] =
    React.useState<typeof import('../Utils/gearSearch').searchGear>();
  React.useEffect(() => {
    import('../Utils/gearSearch').then((m) =>
      setGearSearch(() => m.searchGear)
    );
  }, []);
  const results = React.useMemo(
    () => topResults([...searchScored(query), ...(gearSearch?.(query) ?? [])]),
    [query, gearSearch]
  );
  const listRef = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const go = (i: number) => {
    const r = results[i];
    if (!r) return;
    onClose();
    navigate(r.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') go(index);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-pw-deep/60 px-4 pt-[12vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-label="Search"
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-pw-paper shadow-lift"
      >
        <div className="flex items-center gap-3 border-b px-4">
          <SearchIcon className="text-pw-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search Pals, items, buildings, skills…"
            className="h-14 flex-1 bg-transparent text-lg outline-none"
          />
          <kbd className="rounded-md border px-1.5 py-0.5 text-xs text-pw-muted">
            Esc
          </kbd>
        </div>
        <ul ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {results.map((r, i) => (
            <li key={r.to}>
              <button
                type="button"
                onClick={() => go(i)}
                onMouseMove={() => setIndex(i)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left',
                  i === index && 'bg-pw-cream'
                )}
              >
                {r.icon ? (
                  <img
                    src={r.icon}
                    alt=""
                    className="size-8 object-contain"
                    onError={(e) =>
                      (e.currentTarget.style.visibility = 'hidden')
                    }
                  />
                ) : (
                  <span className="size-8" />
                )}
                <span className="flex-1 font-semibold">{r.label}</span>
                {r.detail && (
                  <span className="text-sm text-pw-muted">{r.detail}</span>
                )}
                <span className="rounded-full bg-pw-navy/10 px-2 py-0.5 text-xs font-semibold text-pw-navy">
                  {r.kind}
                </span>
              </button>
            </li>
          ))}
          {query && results.length === 0 && (
            <li className="px-3 py-6 text-center text-pw-muted">
              No matches for “{query}”
            </li>
          )}
          {!query && (
            <li className="px-3 py-6 text-center text-pw-muted">
              Type a name or Paldeck number
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
