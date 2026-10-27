import { Link, useLocation } from 'react-router';
import { SearchIcon } from './Icons';
import { SECTIONS } from './sections';
import { useSearch } from '../Utils/SearchContext';
import { cn } from '../Utils/cn';

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

export default function Navbar() {
  const { pathname } = useLocation();
  const { openSearch } = useSearch();

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-(--header-h) items-center gap-3 border-b-4 border-pw-sun bg-pw-deep px-4 text-white lg:px-6">
      <Link
        to="/"
        className="flex shrink-0 items-center gap-2.5"
        aria-label="Paldex home"
      >
        <img className="size-9 lg:size-10" src="/favicon.svg" alt="" />
        <span className="font-display text-3xl font-bold tracking-wide">
          Paldex
        </span>
      </Link>

      <nav
        aria-label="Sections"
        className="ml-4 hidden items-center gap-1 lg:flex"
      >
        {SECTIONS.map((s) => {
          const active = s.isActive(pathname);
          return (
            <Link
              key={s.id}
              to={s.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition',
                active
                  ? 'bg-pw-sun text-pw-deep'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              )}
            >
              <s.icon className="size-4" />
              {s.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={openSearch}
        aria-label="Search"
        className="ml-auto hidden h-10 w-64 items-center gap-2.5 rounded-full bg-white/10 px-4 text-left text-sm text-white/70 ring-1 ring-white/20 transition hover:bg-white/20 sm:flex"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="flex-1">Search…</span>
        <kbd className="rounded-md border border-white/30 px-1.5 py-0.5 text-xs">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>
      <button
        type="button"
        onClick={openSearch}
        aria-label="Search"
        className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 sm:hidden"
      >
        <SearchIcon />
      </button>
    </header>
  );
}
