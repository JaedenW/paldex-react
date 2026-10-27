import React from 'react';
import { CheckIcon, ChevronIcon, SearchIcon } from './Icons';
import { normalise } from '../Utils/text';
import { cn } from '../Utils/cn';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/** Lists with more options than this get a search box */
const SEARCH_FROM = 6;
const PANEL_MAX_WIDTH = 352; // 22rem

/**
 * A dropdown in the app's own style, in place of the browser's. The panel
 * matches the breeding calculator's pickers: rounded, with a search box when the
 * list is long. Arrow keys move, Enter picks, Escape closes, and a choice other
 * than the first option (the default) lights up the border so active filters show.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  searchable = options.length >= SEARCH_FROM,
  className,
  triggerClassName,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  /** Names the control for screen readers, and heads the search box */
  label: string;
  /** Show a search box; on by default for longer lists */
  searchable?: boolean;
  className?: string;
  triggerClassName?: string;
}) {
  const id = React.useId();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [index, setIndex] = React.useState(0);
  const [place, setPlace] = React.useState({ right: false, up: false });

  const current = options.find((o) => o.value === value) ?? options[0];
  const isDefault = current === options[0];

  const shown = React.useMemo(() => {
    const q = normalise(query.trim());
    if (!q) return options;
    return options
      .filter((o) => normalise(o.label).includes(q))
      .sort(
        (a, b) =>
          Number(normalise(b.label).startsWith(q)) -
          Number(normalise(a.label).startsWith(q))
      );
  }, [options, query]);

  const openMenu = () => {
    // open towards the side and direction with room, so the panel stays on screen
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPlace({
        right:
          rect.left + PANEL_MAX_WIDTH > window.innerWidth - 12 &&
          rect.right > PANEL_MAX_WIDTH - 40,
        up:
          window.innerHeight - rect.bottom < 300 &&
          rect.top > window.innerHeight - rect.bottom,
      });
    }
    setQuery('');
    setIndex(
      Math.max(
        0,
        options.findIndex((o) => o.value === value)
      )
    );
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const pick = (o: SelectOption<T> | undefined) => {
    if (!o) return;
    onChange(o.value);
    close();
  };

  React.useEffect(() => {
    if (!open) return;
    (searchable ? searchRef.current : listRef.current)?.focus();
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open, searchable]);

  React.useEffect(() => {
    if (open)
      listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' });
  }, [index, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setIndex(shown.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(shown[index]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  const listId = `${id}-list`;
  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label}: ${current?.label ?? ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            openMenu();
          }
        }}
        className={cn(
          'flex h-10 max-w-full items-center gap-2 rounded-full border bg-pw-field pr-3 pl-4 text-left text-sm font-medium transition hover:border-pw-teal',
          !isDefault && 'border-pw-teal ring-1 ring-pw-teal/40',
          open && 'border-pw-teal',
          triggerClassName
        )}
      >
        <span className="min-w-0 flex-1 truncate">{current?.label}</span>
        <ChevronIcon
          className={cn(
            'size-4 shrink-0 rotate-90 text-pw-muted transition',
            open && '-rotate-90'
          )}
        />
      </button>

      {open && (
        <div
          onKeyDown={onKeyDown}
          className={cn(
            'absolute z-40 w-max max-w-[min(22rem,calc(100vw-1.5rem))] min-w-full rounded-2xl border bg-pw-paper p-1 shadow-lift',
            place.right ? 'right-0' : 'left-0',
            place.up ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {searchable && (
            <div className="relative p-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-pw-muted" />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-label={`Search ${label}`}
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={
                  shown[index] ? `${id}-${index}` : undefined
                }
                autoComplete="off"
                value={query}
                placeholder="Search…"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIndex(0);
                }}
                className="h-9 w-full rounded-full border bg-pw-field pr-3 pl-9 text-sm outline-none focus:border-pw-teal"
              />
            </div>
          )}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            className="max-h-64 overflow-y-auto outline-none"
          >
            {shown.map((o, i) => {
              const selected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={selected}
                  onMouseMove={() => setIndex(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm',
                    i === index && 'bg-pw-cream',
                    selected && 'font-semibold'
                  )}
                >
                  <span className="min-w-0 flex-1 break-words">{o.label}</span>
                  {selected && (
                    <CheckIcon className="size-4 shrink-0 text-pw-link" />
                  )}
                </li>
              );
            })}
            {shown.length === 0 && (
              <li className="px-3 py-3 text-center text-sm text-pw-muted">
                No matches for “{query}”
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
