import { Link } from 'react-router';
import type { Element } from '../types';
import { elementColours } from '../Utils/elements';
import { cn } from '../Utils/cn';

export default function ElementBadge({
  element,
  linked = true,
  size = 'md',
  className,
}: {
  element: Element;
  /** Renders a link to the element page; turn off inside another link. */
  linked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const classes = cn(
    'inline-flex items-center rounded-full font-semibold text-white ring-1 ring-black/10 ring-inset',
    size === 'sm' && 'h-6 px-2.5 text-xs',
    size === 'md' && 'h-7 px-3 text-sm',
    size === 'lg' && 'h-9 px-4 text-base',
    linked && 'transition hover:brightness-110',
    className
  );
  const style = { backgroundColor: elementColours[element] ?? '#8c8a82' };
  return linked ? (
    <Link
      to={`/elements#${element.toLowerCase()}`}
      className={classes}
      style={style}
    >
      {element}
    </Link>
  ) : (
    <span className={classes} style={style}>
      {element}
    </span>
  );
}
