import React from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router';
import { CloseIcon, MenuIcon, SearchIcon } from './Icons';
import { SidebarBody } from './Sidebar';
import { useSearch } from '../Utils/SearchContext';

/** A slide-in copy of the side navigation, for phones and tablets */
function Drawer({ onClose }: { onClose: () => void }) {
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
    >
      <button
        type="button"
        aria-label="Close navigation"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-pw-deep/60 backdrop-blur-sm"
      />
      <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-drawer-in flex-col border-r-4 border-pw-sun bg-pw-deep text-white shadow-lift">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute top-4 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
        >
          <CloseIcon className="size-4" />
        </button>
        <SidebarBody onNavigate={onClose} />
      </aside>
    </div>,
    document.body
  );
}

/** The slim header on phones and tablets: menu button, logo and search */
export default function TopBar() {
  const { openSearch } = useSearch();
  const { pathname } = useLocation();
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);

  // a link chosen in the drawer closes it, as does any other navigation
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-(--header-h) items-center gap-2 border-b-4 border-pw-sun bg-pw-deep px-3 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex size-10 items-center justify-center rounded-full transition hover:bg-white/10"
        >
          <MenuIcon className="size-6" />
        </button>
        <Link
          to="/"
          className="flex items-center gap-2"
          aria-label="Paldex home"
        >
          <img className="size-7" src="/favicon.svg" alt="" />
          <span className="font-display text-2xl font-bold tracking-wide">
            Paldex
          </span>
        </Link>
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search"
          className="ml-auto flex h-10 items-center gap-2 rounded-full bg-white/10 pr-4 pl-3 text-sm text-white/80 ring-1 ring-white/20 transition hover:bg-white/20"
        >
          <SearchIcon className="size-4" />
          Search
        </button>
      </header>
      {open && <Drawer onClose={close} />}
    </>
  );
}
