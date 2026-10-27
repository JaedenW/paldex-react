import { Link, useLocation } from 'react-router';
import { SearchIcon } from './Icons';
import { GROUPS, HOME } from './sections';
import { useSearch } from '../Utils/SearchContext';
import { cn } from '../Utils/cn';

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * The navigation itself: logo, search and every section in two labelled groups.
 * It's the fixed side menu on wide screens and the slide-in drawer on phones;
 * `onNavigate` lets the drawer close when something is chosen.
 */
export function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const { openSearch } = useSearch();

  const item = (s: typeof HOME) => {
    const active = s.isActive(pathname);
    return (
      <li key={s.id}>
        <Link
          to={s.to}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'group flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-semibold transition',
            active
              ? 'bg-pw-sun text-pw-deep shadow-[0_2px_0_rgb(0_0_0/0.25)]'
              : 'text-white/80 hover:bg-white/10 hover:text-white'
          )}
        >
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              active ? 'bg-pw-deep/15' : 'bg-white/10 group-hover:bg-white/15'
            )}
          >
            <s.icon className="size-[18px]" />
          </span>
          {s.label}
        </Link>
      </li>
    );
  };

  return (
    <>
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 pt-5 pb-4"
        aria-label="Paldex home"
      >
        <img className="size-10" src="/favicon.svg" alt="" />
        <span className="font-display text-3xl leading-none font-bold tracking-wide">
          Paldex
        </span>
      </Link>

      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          openSearch();
        }}
        className="mx-4 mb-4 flex h-10 items-center gap-2.5 rounded-xl bg-white/10 px-3 text-left text-sm text-white/70 ring-1 ring-white/15 transition hover:bg-white/15"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="flex-1">Search…</span>
        <kbd className="hidden rounded-md border border-white/25 px-1.5 py-0.5 text-xs lg:inline">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>

      <nav aria-label="Sections" className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="mb-3">{item(HOME)}</ul>
        {GROUPS.map((g) => (
          <div key={g.id} className="mb-3">
            <p className="flex items-center gap-2 px-3 pb-1 text-[11px] font-semibold tracking-[0.16em] text-white/45 uppercase">
              <span
                aria-hidden="true"
                className="size-1.5 rotate-45 bg-pw-sun"
              />
              {g.label}
            </p>
            <ul className="space-y-0.5">{g.sections.map(item)}</ul>
          </div>
        ))}
      </nav>

      <p className="border-t border-white/10 px-5 py-3 text-xs text-white/45">
        Unofficial fan project. Data from the community Palworld wiki.
      </p>
    </>
  );
}

/** Side navigation for wide screens */
export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--sidebar-w) flex-col border-r-4 border-pw-sun bg-pw-deep text-white lg:flex">
      <SidebarBody />
    </aside>
  );
}
