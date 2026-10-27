import { Link } from 'react-router';
import type { Pal } from '../types';
import ElementBadge from './ElementBadge';
import PalImage from './PalImage';
import { elementColours } from '../Utils/elements';
import { cn } from '../Utils/cn';

export default function PalCard({
  pal,
  compact = false,
}: {
  pal: Pal;
  compact?: boolean;
}) {
  const colour = elementColours[pal.elements[0]] ?? '#8c8a82';
  return (
    <Link
      to={`/pal/${pal.id}`}
      className={cn(
        'group relative flex overflow-hidden rounded-2xl border bg-pw-paper shadow-card transition hover:-translate-y-0.5 hover:shadow-lift',
        compact ? 'items-center gap-3 p-2.5' : 'flex-col items-center p-3 pt-4'
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: colour }}
      />
      <PalImage
        pal={pal}
        className={cn(
          'shrink-0 transition group-hover:scale-105',
          compact ? 'size-12' : 'size-24'
        )}
      />
      <div className={cn('min-w-0', compact ? 'flex-1' : 'mt-2 text-center')}>
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
