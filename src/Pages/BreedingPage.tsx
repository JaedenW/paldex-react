import React from 'react';
import { Link } from 'react-router';
import PalImage from '../Components/PalImage';
import ElementBadge from '../Components/ElementBadge';
import { Page, PageHeader, Panel } from '../Components/ui';
import { palById, pals, uniqueCombos } from '../data';
import { useQueryState } from '../Hooks/useQueryState';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { createBreeder } from '../Utils/breeding';
import type { Pal } from '../types';

const breeder = createBreeder(pals, uniqueCombos);

function PalPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const pal = palById.get(value);
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-pw-cream/70 p-4">
      <p className="text-xs font-semibold tracking-wide text-pw-muted uppercase">
        {label}
      </p>
      {pal ? (
        <PalImage pal={pal} variant="art" className="size-28" />
      ) : (
        <div className="size-28 rounded-full border-2 border-dashed" />
      )}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full max-w-xs rounded-full border bg-white px-3 font-medium"
      >
        <option value="">Choose a Pal…</option>
        {pals.map((p) => (
          <option key={p.id} value={p.id}>
            #{p.number} {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChildCard({ child, a, b }: { child: Pal; a: Pal; b: Pal }) {
  const listed = uniqueCombos.some(
    ([x, y, c]) =>
      c === child.id &&
      ((x === a.id && y === b.id) || (x === b.id && y === a.id))
  );
  return (
    <Link
      to={`/pal/${child.id}`}
      className="flex flex-col items-center gap-2 rounded-2xl bg-pw-navy p-5 text-center text-white transition hover:bg-pw-deep"
    >
      <PalImage pal={child} variant="art" className="size-32" />
      <p className="text-sm font-semibold tracking-wide text-white/70">
        #{child.number}
      </p>
      <p className="font-display text-3xl font-bold">{child.name}</p>
      <div className="flex gap-1">
        {child.elements.map((e) => (
          <ElementBadge key={e} element={e} linked={false} size="sm" />
        ))}
      </div>
      <p className="text-sm text-white/70">
        Rank {child.breeding.rank} · {child.breeding.egg} ·{' '}
        {listed ? 'Unique combination' : 'By rank'}
      </p>
    </Link>
  );
}

export default function BreedingPage() {
  useDocumentTitle('Breeding calculator');
  const [aId, setA] = useQueryState('a');
  const [bId, setB] = useQueryState('b');
  const a = palById.get(aId),
    b = palById.get(bId);
  const child = React.useMemo(
    () => (a && b ? breeder.breed(a, b) : undefined),
    [a, b]
  );

  return (
    <Page>
      <PageHeader
        title="Breeding calculator"
        subtitle="Pick two parents to see what hatches. Pairs are stored in the link, so you can share a result."
      />
      <Panel>
        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <PalPicker label="Parent 1" value={aId} onChange={setA} />
          <span className="text-center font-display text-4xl font-bold text-pw-sun">
            +
          </span>
          <PalPicker label="Parent 2" value={bId} onChange={setB} />
          <span className="text-center font-display text-4xl font-bold text-pw-sun">
            =
          </span>
          {child && a && b ? (
            <ChildCard child={child} a={a} b={b} />
          ) : (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center text-pw-muted">
              Choose two Pals
            </div>
          )}
        </div>
      </Panel>
    </Page>
  );
}
