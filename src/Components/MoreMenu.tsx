import React from 'react';
import { Link, useLocation } from 'react-router';
import { MORE_SECTIONS } from './sections';
import { cn } from '../Utils/cn';

/** The less-used sections, in a popover that opens below (top bar) or above (tab bar) */
export default function MoreMenu({
  placement,
  className,
  buttonClassName,
  children,
}: {
  placement: 'below' | 'above';
  className?: string;
  /** Styles for the button, given whether a More page is open or the menu is */
  buttonClassName: (state: { highlighted: boolean }) => string;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const active = MORE_SECTIONS.some((s) => s.isActive(pathname));

  // close on navigation
  React.useEffect(() => setOpen(false), [pathname]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More sections"
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName({ highlighted: active || open })}
      >
        {children}
      </button>
      {open && (
        <ul
          role="menu"
          className={cn(
            'absolute z-50 w-60 rounded-2xl border bg-pw-paper p-1.5 text-pw-ink shadow-lift',
            placement === 'below'
              ? 'top-full right-0 mt-2'
              : 'right-0 bottom-full mb-3'
          )}
        >
          {MORE_SECTIONS.map((s) => (
            <li key={s.id} role="none">
              <Link
                role="menuitem"
                to={s.to}
                aria-current={s.isActive(pathname) ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition hover:bg-pw-cream',
                  s.isActive(pathname) && 'bg-pw-cream text-pw-teal-dark'
                )}
              >
                <s.icon className="size-5" />
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
