import { Link } from 'react-router';
import type { Pal } from '../types';
import ElementBadge from './ElementBadge';
import PalImage from './PalImage';
import { elementColours } from '../Utils/elements';
import { cn } from '../Utils/cn';

/**
 * A Pal as a card: its art on a tile tinted with its element's colour, then
 * number, name and elements. The icons are framed tightly, so the tile is a
 * rounded square that fits them rather than a circle that shows their corners.
 */
export default function PalCard({
  pal,
  compact = false,
}: {
  pal: Pal;
  compact?: boolean;
}) {
  const colour = elementColours[pal.elements[0]] ?? '#8c8a82';
  const tint = {
    backgroundImage: `linear-gradient(160deg, color-mix(in srgb, ${colour} 30%, transparent), color-mix(in srgb, ${colour} 8%, transparent))`,
  };
  return (
    <Link
      to={`/pal/${pal.id}`}
      className={cn(
        'group flex card-link card p-3',
        compact ? 'items-center gap-3' : 'flex-col gap-2.5'
      )}
    >
      <span
        className={cn(
          'overflow-hidden',
          compact
            ? 'size-14 shrink-0 rounded-xl'
            : 'aspect-square w-full rounded-xl'
        )}
        style={tint}
      >
        <PalImage
          pal={pal}
          className="size-full transition duration-200 group-hover:scale-105"
        />
      </span>
      <div className={cn('min-w-0', compact ? 'flex-1' : 'text-center')}>
        <p className="text-xs font-semibold tracking-wide text-pw-muted">
          #{pal.number}
        </p>
        <p className="truncate font-display text-xl leading-tight font-bold">
          {pal.name}
        </p>
        {!compact && (
          <div className="mt-1.5 flex flex-wrap justify-center gap-1">
            {pal.elements.map((e) => (
              <ElementBadge key={e} element={e} linked={false} size="sm" />
            ))}
          </div>
        )}
      </div>
      {compact && (
        <div className="flex gap-1">
          {pal.elements.map((e) => (
            <ElementBadge key={e} element={e} linked={false} size="sm" />
          ))}
        </div>
      )}
    </Link>
  );
}
