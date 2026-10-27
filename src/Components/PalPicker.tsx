import React from 'react';
import { Link } from 'react-router';
import Combobox from './Combobox';
import ElementBadge from './ElementBadge';
import PalImage from './PalImage';
import { palById, pals } from '../data';
import { matchScore } from '../Utils/search';
import type { Pal } from '../types';

function PalOption({ pal }: { pal: Pal }) {
  return (
    <span className="flex items-center gap-3">
      <PalImage pal={pal} className="size-9" />
      <span className="flex-1 font-semibold">{pal.name}</span>
      <span className="text-xs text-pw-muted">#{pal.number}</span>
      <span className="flex gap-1">
        {pal.elements.map((e) => (
          <ElementBadge key={e} element={e} linked={false} size="sm" />
        ))}
      </span>
    </span>
  );
}

/** Finds Pals by name or Paldeck number */
export function suggestPals(query: string): Pal[] {
  const q = query.trim().replace(/^#/, '');
  return pals
    .map((p) => ({
      p,
      score:
        p.number.toLowerCase() === q.toLowerCase() ? 5 : matchScore(p.name, q),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
    .slice(0, 8)
    .map((x) => x.p);
}

/**
 * Search box and the chosen Pal beneath it, with its art, elements and
 * breeding rank. `value` is a Pal id, or empty.
 */
export default function PalPicker({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  /** Extra controls shown under the chosen Pal, such as its traits */
  children?: React.ReactNode;
}) {
  const pal = palById.get(value);
  return (
    <div className="rounded-2xl bg-pw-cream/70 p-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-pw-muted uppercase">
        {label}
      </p>
      <Combobox
        label={`${label}: search for a Pal`}
        placeholder="Search by name or number…"
        suggest={suggestPals}
        onPick={(p) => onChange(p.id)}
        keyOf={(p) => p.id}
        render={(p) => <PalOption pal={p} />}
        emptyHint="Type a Pal’s name or Paldeck number"
      />
      {pal ? (
        <div className="mt-3 flex items-center gap-3">
          <PalImage pal={pal} variant="art" className="size-20 shrink-0" />
          <div className="min-w-0 flex-1">
            <Link
              to={`/pal/${pal.id}`}
              className="font-display text-2xl font-bold hover:underline"
            >
              {pal.name}
            </Link>
            <p className="text-sm text-pw-muted">
              #{pal.number} · rank {pal.breeding.rank}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {pal.elements.map((e) => (
                <ElementBadge key={e} element={e} linked={false} size="sm" />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={`Clear ${label}`}
            className="self-start rounded-full px-2 py-1 text-sm font-semibold text-pw-muted hover:bg-white"
          >
            Clear
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-pw-muted">No Pal chosen yet.</p>
      )}
      {pal && children}
    </div>
  );
}
