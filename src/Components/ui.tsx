import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../Utils/cn';
import { ChevronIcon } from './Icons';

export function Page({
  children,
  className,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-5 sm:px-6 sm:py-8 lg:px-8',
        wide ? 'max-w-7xl' : 'max-w-6xl',
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
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 max-w-prose text-pw-muted">{subtitle}</p>
        )}
      </div>
      {children}
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
    <section
      className={cn(
        'rounded-2xl border bg-pw-paper p-4 shadow-card sm:p-5',
        className
      )}
    >
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 className="flex items-center gap-2 text-2xl text-pw-navy">
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

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed px-4 py-12 text-center">
      <p className="font-display text-2xl font-bold">{title}</p>
      {children && <div className="mt-1 text-pw-muted">{children}</div>}
    </div>
  );
}

export function Breadcrumb({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-pw-teal-dark hover:underline"
    >
      <ChevronIcon className="size-4 rotate-180" />
      {label}
    </Link>
  );
}

const BUTTON = {
  primary: 'bg-pw-navy text-white hover:bg-pw-deep',
  accent: 'bg-pw-sun text-pw-deep hover:brightness-105',
  secondary: 'bg-white text-pw-ink ring-1 ring-pw-line hover:bg-pw-cream',
};

export function buttonClass(
  variant: keyof typeof BUTTON = 'secondary',
  className?: string
) {
  return cn(
    'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition disabled:pointer-events-none disabled:opacity-40',
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
          : 'bg-white text-pw-ink ring-pw-line hover:bg-pw-cream',
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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="h-10 w-full rounded-full border bg-white px-4 text-base outline-none focus:border-pw-teal sm:max-w-xs"
    />
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
    <select
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-10 rounded-full border bg-white px-3 text-sm font-medium"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
