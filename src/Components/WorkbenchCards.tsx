import { Link } from 'react-router';
import ItemIcon from './ItemIcon';
import { Panel } from './ui';
import { buildingByName, itemByName, techByName } from '../data/gear';
import type { CraftPlan } from '../Utils/crafting';
import { cn } from '../Utils/cn';

interface Bench {
  name: string;
  /** Player level that unlocks it, when the wiki says */
  level?: number;
  tech?: string;
  id?: string;
  kind?: string;
}

function benchOf(name: string): Bench {
  const b = buildingByName.get(name);
  const tech = b?.tech ? techByName.get(b.tech) : undefined;
  return {
    name,
    id: b?.id,
    level: tech?.level,
    tech: tech?.name,
    kind: [b?.type, b?.subtype].filter(Boolean).join(' · ') || undefined,
  };
}

function BenchIcon({ bench, className }: { bench: Bench; className: string }) {
  return bench.id ? (
    <ItemIcon
      kind="building"
      id={bench.id}
      name={bench.name}
      className={className}
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center rounded-lg bg-pw-cream font-display font-bold text-pw-muted',
        className
      )}
    >
      {bench.name[0]}
    </span>
  );
}

const byEarliest = (a: Bench, b: Bench) =>
  (a.level ?? Infinity) - (b.level ?? Infinity) || a.name.localeCompare(b.name);

/**
 * The benches a plan needs, one card each: what it will be used for (with how
 * many crafts), other benches that make the same things, and what it takes to
 * unlock and build it. Where several benches would do, the one you can unlock
 * earliest is shown as the main choice.
 */
export default function WorkbenchCards({ plan }: { plan: CraftPlan }) {
  // what each group of interchangeable benches makes in this plan, in crafting order
  const groups = plan.stations.map((names) => {
    const key = [...names].sort().join('|');
    const uses = plan.steps.filter(
      (s) => s.stations.length && [...s.stations].sort().join('|') === key
    );
    const benches = names.map(benchOf).sort(byEarliest);
    return { key, main: benches[0], others: benches.slice(1), uses };
  });
  groups.sort(
    (a, b) =>
      Math.min(...a.uses.map((u) => plan.steps.indexOf(u))) -
      Math.min(...b.uses.map((u) => plan.steps.indexOf(u)))
  );

  return (
    <Panel title={`Workbenches needed (${groups.length})`}>
      <ul className="grid-fluid [--min:21rem]">
        {groups.map(({ key, main, others, uses }) => (
          <li
            key={key}
            className="flex flex-col gap-3 rounded-2xl border bg-pw-cream/30 p-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-pw-paper ring-1 ring-pw-line">
                <BenchIcon bench={main} className="size-11" />
              </span>
              <div className="min-w-0 flex-1">
                {main.id ? (
                  <Link
                    to={`/building/${main.id}`}
                    className="block font-display text-xl leading-tight font-bold hover:underline"
                  >
                    {main.name}
                  </Link>
                ) : (
                  <span className="block font-display text-xl leading-tight font-bold">
                    {main.name}
                  </span>
                )}
                {main.kind && (
                  <span className="text-xs text-pw-muted">{main.kind}</span>
                )}
              </div>
              {main.level !== undefined && (
                <span
                  className="shrink-0 rounded-full bg-pw-navy px-2.5 py-0.5 text-xs font-semibold text-white"
                  title={main.tech ? `Unlocked by ${main.tech}` : undefined}
                >
                  Lv. {main.level}
                </span>
              )}
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-pw-muted uppercase">
                Used for
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {uses.map((s) => {
                  const item = itemByName.get(s.product);
                  return (
                    <li
                      key={s.product}
                      className="flex items-center gap-1.5 rounded-full bg-pw-paper py-0.5 pr-2.5 pl-0.5 text-sm ring-1 ring-pw-line"
                    >
                      {item && item.type !== 'Schematic' ? (
                        <ItemIcon
                          id={item.id}
                          name={s.product}
                          rarity={item.rarity}
                          className="size-6 shrink-0"
                        />
                      ) : (
                        <span aria-hidden="true" className="size-6 shrink-0" />
                      )}
                      <span className="font-medium">{s.product}</span>
                      <span className="text-xs text-pw-muted">
                        {s.batches}×
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {others.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-pw-muted uppercase">
                  Or use
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {others.map((b) => {
                    const body = (
                      <>
                        <BenchIcon bench={b} className="size-6 shrink-0" />
                        <span className="font-medium">{b.name}</span>
                        {b.level !== undefined && (
                          <span className="text-xs text-pw-muted">
                            Lv. {b.level}
                          </span>
                        )}
                      </>
                    );
                    const cls =
                      'flex items-center gap-1.5 rounded-full bg-pw-paper py-0.5 pr-2.5 pl-0.5 text-sm ring-1 ring-pw-line';
                    return (
                      <li key={b.name}>
                        {b.id ? (
                          <Link
                            to={`/building/${b.id}`}
                            className={cn(cls, 'transition hover:ring-pw-teal')}
                          >
                            {body}
                          </Link>
                        ) : (
                          <span className={cls}>{body}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {main.id && (
              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-2 text-sm">
                {main.tech && (
                  <Link
                    to={`/technology?q=${encodeURIComponent(main.tech)}`}
                    className="font-semibold text-pw-link hover:underline"
                  >
                    Unlock: {main.tech}
                  </Link>
                )}
                <Link
                  to={`/crafting?building=${main.id}`}
                  className="font-semibold text-pw-link hover:underline"
                >
                  How to build it
                </Link>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
