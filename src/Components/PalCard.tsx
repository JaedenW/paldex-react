import { Link } from 'react-router';
import type { Pal } from '../types';
import ElementBadge from './ElementBadge';
import PalImage from './PalImage';
import { elementColours } from '../Utils/elements';
import { cn } from '../Utils/cn';

/** A Pal as a card: art on a wash of its element's colour, number, name and elements */
export default function PalCard({
  pal,
  compact = false,
}: {
  pal: Pal;
  compact?: boolean;
}) {
  const colour = elementColours[pal.elements[0]] ?? '#8c8a82';
  const wash = {
    backgroundImage: `radial-gradient(circle at 50% 35%, color-mix(in srgb, ${colour} 28%, transparent), transparent 70%)`,
  };
  return (
    <Link
      to={`/pal/${pal.id}`}
      className={cn(
        'group relative flex card-link overflow-hidden card',
        compact ? 'items-center gap-3 p-2.5' : 'flex-col items-center p-3 pt-4'
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: colour }}
      />
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full',
          compact ? 'size-14' : 'size-28'
        )}
        style={wash}
      >
        <PalImage
          pal={pal}
          className={cn(
            'transition duration-200 group-hover:scale-110',
            compact ? 'size-12' : 'size-24'
          )}
        />
      </span>
      <div
        className={cn(
          'min-w-0',
          compact ? 'flex-1' : 'mt-1 w-full text-center'
        )}
      >
        <p className="text-xs font-semibold tracking-wide text-pw-muted">
          #{pal.number}
        </p>
        <p className="truncate font-display text-xl leading-tight font-bold">
          {pal.name}
        </p>
        {!compact && (
          <div className="mt-2 flex flex-wrap justify-center gap-1">
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
