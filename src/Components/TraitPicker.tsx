import React from 'react';
import Combobox from './Combobox';
import { SectionLabel } from './ui';
import { matchScore } from '../Utils/search';
import { cn } from '../Utils/cn';

export interface TraitOption {
  id: string;
  name: string;
  description?: string;
  /** Colours the chip, such as a passive's tier */
  tone?: 'good' | 'bad' | 'plain';
  /** Small text on the right of a suggestion */
  detail?: string;
  /** Sorts ahead of equally good matches, such as a Pal's own skills */
  boost?: number;
}

const TONES = {
  good: 'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-400/20 dark:text-amber-100 dark:ring-amber-400/40',
  bad: 'bg-red-100 text-red-800 ring-red-300 dark:bg-red-400/20 dark:text-red-100 dark:ring-red-400/40',
  plain: 'bg-pw-field text-pw-ink ring-pw-line',
};

/**
 * Pick several traits (passive skills or active skills) by searching: chosen
 * ones show as removable chips. `max` caps how many can be chosen.
 */
export default function TraitPicker({
  label,
  options,
  selected,
  onChange,
  max,
  placeholder = 'Search…',
}: {
  label: string;
  options: TraitOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  placeholder?: string;
}) {
  const byId = React.useMemo(
    () => new Map(options.map((o) => [o.id, o])),
    [options]
  );
  const full = max !== undefined && selected.length >= max;

  const suggest = React.useCallback(
    (query: string) =>
      options
        .filter((o) => !selected.includes(o.id))
        .map((o) => ({
          o,
          score:
            matchScore(o.name, query) ||
            (o.description && matchScore(o.description, query) ? 0.5 : 0),
        }))
        .filter((x) => x.score > 0)
        .sort(
          (a, b) =>
            b.score +
              (b.o.boost ?? 0) * 0.1 -
              (a.score + (a.o.boost ?? 0) * 0.1) ||
            a.o.name.localeCompare(b.o.name)
        )
        .slice(0, 8)
        .map((x) => x.o),
    [options, selected]
  );

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <SectionLabel>{label}</SectionLabel>
        {max !== undefined && (
          <span className="text-xs text-pw-muted">
            {selected.length} of {max}
          </span>
        )}
      </div>
      <Combobox
        label={`${label}: search`}
        placeholder={full ? `Up to ${max} chosen` : placeholder}
        disabled={full}
        suggest={suggest}
        onPick={(o) => onChange([...selected, o.id])}
        keyOf={(o) => o.id}
        render={(o) => (
          <span className="block">
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold">{o.name}</span>
              {o.detail && (
                <span className="text-xs text-pw-muted">{o.detail}</span>
              )}
            </span>
            {o.description && (
              <span className="block truncate text-xs text-pw-muted">
                {o.description}
              </span>
            )}
          </span>
        )}
      />
      {selected.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const o = byId.get(id);
            return (
              <li key={id}>
                <span
                  title={o?.description}
                  className={cn(
                    'inline-flex h-8 items-center gap-1 rounded-full pr-1 pl-3 text-sm font-semibold ring-1',
                    TONES[o?.tone ?? 'plain']
                  )}
                >
                  {o?.name ?? id}
                  <button
                    type="button"
                    aria-label={`Remove ${o?.name ?? id}`}
                    onClick={() => onChange(selected.filter((x) => x !== id))}
                    className="flex size-6 items-center justify-center rounded-full hover:bg-black/10"
                  >
                    ×
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
