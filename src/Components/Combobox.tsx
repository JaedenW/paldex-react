import React from 'react';
import { cn } from '../Utils/cn';

/**
 * A text box with a dropdown of suggestions: arrow keys move, Enter picks,
 * Escape closes. What the suggestions are, and what picking one does, is up
 * to the caller.
 */
export default function Combobox<T>({
  label,
  placeholder,
  suggest,
  onPick,
  keyOf,
  render,
  emptyHint,
  disabled,
  className,
}: {
  label: string;
  placeholder: string;
  /** Matches for what has been typed, best first */
  suggest: (query: string) => T[];
  onPick: (item: T) => void;
  keyOf: (item: T) => string;
  render: (item: T) => React.ReactNode;
  /** Shown when nothing has been typed yet */
  emptyHint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = React.useId();
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const items = React.useMemo(
    () => (query.trim() ? suggest(query) : []),
    [query, suggest]
  );

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const pick = (item: T | undefined) => {
    if (item === undefined) return;
    onPick(item);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      pick(items[index]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const listId = `${id}-list`;
  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && items[index] ? `${id}-${keyOf(items[index])}` : undefined
        }
        autoComplete="off"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="h-11 w-full rounded-full border bg-white px-4 outline-none focus:border-pw-teal disabled:opacity-50"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border bg-pw-paper p-1 shadow-lift"
        >
          {items.map((item, i) => (
            <li
              key={keyOf(item)}
              id={`${id}-${keyOf(item)}`}
              role="option"
              aria-selected={i === index}
              onMouseMove={() => setIndex(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(item)}
              className={cn(
                'cursor-pointer rounded-xl px-3 py-1.5',
                i === index && 'bg-pw-cream'
              )}
            >
              {render(item)}
            </li>
          ))}
          {query.trim() && items.length === 0 && (
            <li className="px-3 py-3 text-center text-sm text-pw-muted">
              No matches for “{query}”
            </li>
          )}
          {!query.trim() && emptyHint && (
            <li className="px-3 py-3 text-center text-sm text-pw-muted">
              {emptyHint}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
