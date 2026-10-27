import { Link } from 'react-router';
import PalImage from './PalImage';
import { Chip, buttonClass } from './ui';
import { useShowMore } from '../Hooks/useShowMore';
import type { BreedMethod } from '../Utils/breeding';
import { METHOD_LABELS } from '../Utils/breedingText';
import { cn } from '../Utils/cn';
import type { Pal } from '../types';

export interface ParentPair {
  a: Pal;
  b: Pal;
  method: BreedMethod;
}

const METHODS: BreedMethod[] = ['listed', 'rank', 'same', 'gender'];

/** Pairs that include a given Pal and/or whose names match some text */
export function filterPairs(
  pairs: ParentPair[],
  opts: { text?: string; palId?: string; method?: string }
) {
  const q = opts.text?.trim().toLowerCase();
  return pairs.filter(
    (p) =>
      (!opts.palId || p.a.id === opts.palId || p.b.id === opts.palId) &&
      (!opts.method || p.method === opts.method) &&
      (!q ||
        p.a.name.toLowerCase().includes(q) ||
        p.b.name.toLowerCase().includes(q))
  );
}

/** Filter chips for how a pair makes its child, with how many pairs each has */
export function MethodChips({
  pairs,
  value,
  onChange,
}: {
  pairs: ParentPair[];
  value: string;
  onChange: (method: string) => void;
}) {
  const counts: Partial<Record<BreedMethod, number>> = {};
  for (const p of pairs) counts[p.method] = (counts[p.method] ?? 0) + 1;
  const present = METHODS.filter((m) => counts[m]);
  if (present.length < 2) return null; // nothing to choose between
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="How the pair makes the child"
    >
      <Chip active={!value} onClick={() => onChange('')}>
        All ({pairs.length})
      </Chip>
      {present.map((m) => (
        <Chip
          key={m}
          active={value === m}
          onClick={() => onChange(value === m ? '' : m)}
        >
          {METHOD_LABELS[m]} ({counts[m]})
        </Chip>
      ))}
    </div>
  );
}

function ParentLink({ pal, highlight }: { pal: Pal; highlight?: boolean }) {
  return (
    <Link
      to={`/pal/${pal.id}`}
      className={cn(
        'flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-pw-cream',
        highlight && 'bg-pw-sun/20'
      )}
    >
      <PalImage pal={pal} className="size-9 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{pal.name}</span>
        <span className="block text-xs text-pw-muted">
          rank {pal.breeding.rank}
        </span>
      </span>
    </Link>
  );
}

/**
 * Pairs of parents as cards. It starts with a short list and has a Show more
 * button, since some Pals have hundreds of pairs. The + opens the pair in the
 * calculator.
 */
export default function ParentPairList({
  pairs,
  highlightId,
  resetKey,
  first = 12,
  step = 24,
}: {
  pairs: ParentPair[];
  /** A parent to highlight in each pair, such as the one being filtered on */
  highlightId?: string;
  resetKey?: string;
  first?: number;
  step?: number;
}) {
  const { shown, remaining, next, showMore } = useShowMore(
    pairs.length,
    first,
    step,
    resetKey
  );
  if (pairs.length === 0)
    return <p className="text-pw-muted">No pair matches those filters.</p>;
  return (
    <>
      <ul className="grid-fluid [--min:21rem]">
        {pairs.slice(0, shown).map(({ a, b, method }) => (
          <li
            key={`${a.id}|${b.id}`}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 card p-1.5"
          >
            <ParentLink pal={a} highlight={a.id === highlightId} />
            <Link
              to={`/breeding?a=${a.id}&b=${b.id}`}
              title={`${METHOD_LABELS[method]}. Open in the calculator`}
              aria-label={`Open ${a.name} and ${b.name} in the calculator`}
              className="flex size-9 items-center justify-center rounded-full bg-pw-sun font-display text-xl font-bold text-pw-deep transition hover:scale-110"
            >
              +
            </Link>
            <ParentLink pal={b} highlight={b.id === highlightId} />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <span className="text-sm text-pw-muted">
          Showing {shown} of {pairs.length}
        </span>
        {remaining > 0 && (
          <button
            type="button"
            onClick={showMore}
            className={buttonClass('primary')}
          >
            Show {next} more
          </button>
        )}
      </div>
    </>
  );
}
