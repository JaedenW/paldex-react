import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../Utils/cn';

/**
 * A square-ish card for grids of items, buildings and the like: an icon on
 * top, a name, a line of detail and an optional badge. Optionally a link.
 */
export default function Tile({
  to,
  icon,
  title,
  meta,
  badge,
  accent,
  className,
}: {
  to?: string;
  icon: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  /** A colour for the card's top edge, such as a rarity */
  accent?: string;
  className?: string;
}) {
  const body = (
    <>
      {accent && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: accent }}
        />
      )}
      <span className="flex size-[4.5rem] items-center justify-center rounded-2xl bg-pw-cream/70 transition duration-200 group-hover:scale-105">
        {icon}
      </span>
      <span className="line-clamp-2 font-display text-lg leading-tight font-bold">
        {title}
      </span>
      {meta && <span className="text-xs text-pw-muted">{meta}</span>}
      {badge}
    </>
  );
  const classes = cn(
    'card group relative flex flex-col items-center gap-1.5 overflow-hidden p-3 pt-4 text-center',
    to && 'card-link',
    className
  );
  return to ? (
    <Link to={to} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
