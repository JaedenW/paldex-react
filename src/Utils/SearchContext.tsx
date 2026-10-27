import React from 'react';

interface SearchState {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

const SearchContext = React.createContext<SearchState | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const openSearch = React.useCallback(() => setOpen(true), []);
  const closeSearch = React.useCallback(() => setOpen(false), []);

  // Ctrl/⌘ + K, or "/" outside a text field
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el?.matches('input, textarea, select, [contenteditable]');
      if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' && !typing)
      ) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = React.useMemo(
    () => ({ open, openSearch, closeSearch }),
    [open, openSearch, closeSearch]
  );
  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = React.useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used inside SearchProvider');
  return ctx;
}
