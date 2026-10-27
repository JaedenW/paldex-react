import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../Utils/cn';
import { ChevronIcon, SearchIcon } from './Icons';

/** The page body: one consistent width, with a gentle fade in on navigation */
export function Page({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  /** Kept so existing pages still compile; every page now shares one width */
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl animate-page-in px-4 py-5 sm:px-6 sm:py-7 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small label above the title, such as the section it belongs to */
  eyebrow?: ReactNode;
  /** Actions, shown on the right */
  children?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-pw-link uppercase">
            <span aria-hidden="true" className="size-2 rotate-45 bg-pw-sun" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 max-w-prose text-pw-muted">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function Panel({
  title,
  children,
  className,
  actions,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn('card p-4 sm:p-5', className)}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 className="flex items-center gap-2 text-2xl text-pw-heading">
              <span
                aria-hidden="true"
                className="size-2.5 rotate-45 bg-pw-sun"
              />
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Search and filter controls that stay in view while a long grid scrolls.
 * It sticks to the top of the scrolling page and bleeds to its edges.
 */
export function Toolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'sticky top-0 z-20 -mx-4 mb-4 border-b bg-pw-cream/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** Used as a heading for a block of controls or results inside a page */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 text-xs font-semibold tracking-[0.12em] text-pw-muted uppercase">
      {children}
    </p>
  );
}

/** A labelled figure: the building block of fact grids */
export function Stat({
  label,
  children,
  hint,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl bg-pw-cream/70 px-3 py-2.5', className)}>
      <dt className="text-[11px] font-semibold tracking-[0.12em] text-pw-muted uppercase">
        {label}
      </dt>
      <dd className="font-display text-xl leading-tight font-bold">
        {children}
      </dd>
      {hint && <p className="text-xs text-pw-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed px-4 py-14 text-center">
      <p className="font-display text-2xl font-bold">{title}</p>
      {children && <div className="mt-1 text-pw-muted">{children}</div>}
    </div>
  );
}

/** Placeholder cards shown while a page's code loads */
export function SkeletonGrid({
  count = 12,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
        className
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-36 skeleton rounded-2xl border" />
      ))}
    </div>
  );
}

/** Where you are: Home › Items › Advanced Bow. The last item is the current page. */
export function Breadcrumbs({
  items,
}: {
  items: { label: string; to?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        <li>
          <Link to="/" className="font-medium text-pw-link hover:underline">
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            <ChevronIcon className="size-3.5 text-pw-muted" />
            {item.to ? (
              <Link
                to={item.to}
                className="font-medium text-pw-link hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-pw-muted">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** A single back link; prefer Breadcrumbs on detail pages */
export function Breadcrumb({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-pw-link hover:underline"
    >
      <ChevronIcon className="size-4 rotate-180" />
      {label}
    </Link>
  );
}

const BUTTON = {
  primary: 'bg-pw-navy text-white hover:bg-pw-deep ring-1 ring-white/10',
  accent: 'bg-pw-sun text-pw-deep hover:brightness-105',
  secondary:
    'bg-pw-field text-pw-ink ring-1 ring-pw-line hover:bg-pw-cream hover:ring-pw-teal',
};

export function buttonClass(
  variant: keyof typeof BUTTON = 'secondary',
  className?: string
) {
  return cn(
    'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition active:translate-y-px disabled:pointer-events-none disabled:opacity-40',
    BUTTON[variant],
    className
  );
}

export function Chip({
  active,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ring-1 transition',
        active
          ? 'bg-pw-navy text-white ring-pw-navy'
          : 'bg-pw-field text-pw-ink ring-pw-line hover:bg-pw-cream hover:ring-pw-teal',
        className
      )}
    >
      {children}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-pw-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-full border bg-pw-field pr-4 pl-10 text-base outline-none focus:border-pw-teal"
      />
    </div>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 appearance-none rounded-full border bg-pw-field pr-9 pl-4 text-sm font-medium outline-none focus:border-pw-teal"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90 text-pw-muted" />
    </div>
  );
}
