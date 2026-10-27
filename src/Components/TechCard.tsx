import React from 'react';
import { Link } from 'react-router';
import ItemIcon from './ItemIcon';
import { LockIcon } from './Icons';
import { buildingByName, itemByName } from '../data/gear';
import { unlockCategory } from '../Utils/tech';
import type { Tech } from '../types';
import { cn } from '../Utils/cn';

type Unlock = NonNullable<Tech['unlocks']>[number];

function resolve(u: Unlock) {
  if (u.kind === 'item') {
    const item = itemByName.get(u.name);
    return {
      to: item && `/item/${item.id}`,
      id: item?.id,
      rarity: item?.rarity,
      type: item?.type,
      schematic: item?.type === 'Schematic',
    };
  }
  const b = buildingByName.get(u.name);
  return {
    to: b && `/building/${b.id}`,
    id: b?.id,
    rarity: undefined,
    type: b?.type,
    schematic: false,
  };
}

function UnlockIcon({ u, className }: { u: Unlock; className: string }) {
  const r = resolve(u);
  if (!r.id || r.schematic) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex items-center justify-center rounded-md bg-pw-cream font-display font-bold text-pw-muted',
          className
        )}
      >
        {u.name[0]}
      </span>
    );
  }
  return (
    <ItemIcon
      kind={u.kind}
      id={r.id}
      name={u.name}
      rarity={r.rarity}
      className={className}
    />
  );
}

const SHOWN = 6;

function UnlockChips({ unlocks }: { unlocks: Unlock[] }) {
  const [all, setAll] = React.useState(false);
  const shown = all ? unlocks : unlocks.slice(0, SHOWN);
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {shown.map((u) => {
        const r = resolve(u);
        const body = (
          <>
            <UnlockIcon u={u} className="size-6 shrink-0" />
            <span className="truncate">{u.name}</span>
          </>
        );
        const cls =
          'flex max-w-56 items-center gap-1.5 rounded-full bg-pw-cream/80 py-0.5 pr-2.5 pl-0.5 text-sm font-medium ring-1 ring-pw-line';
        return (
          <li key={`${u.kind}|${u.name}`}>
            {r.to ? (
              <Link
                to={r.to}
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
      {unlocks.length > SHOWN && (
        <li>
          <button
            type="button"
            onClick={() => setAll(!all)}
            className="h-7 rounded-full px-2.5 text-sm font-semibold text-pw-link ring-1 ring-pw-line transition hover:ring-pw-teal"
          >
            {all ? 'Show fewer' : `+${unlocks.length - SHOWN} more`}
          </button>
        </li>
      )}
    </ul>
  );
}

/** What a tech's unlocks are, in a word or two: "Weapons", "Buildings: Production", "Mixed" */
function kindOf(unlocks: Unlock[]): string | undefined {
  const labels = new Set(
    unlocks.map((u) => unlockCategory(u.kind, resolve(u).type).label)
  );
  if (labels.size === 0) return undefined;
  return labels.size === 1 ? [...labels][0] : 'Mixed';
}

/**
 * One technology: what it unlocks (icon first, then every item or building),
 * what it costs, and anything it needs first. Regular and ancient techs differ
 * by the colour of the stripe and the cost badge.
 */
export default function TechCard({
  tech,
  highlight,
}: {
  tech: Tech;
  highlight?: boolean;
}) {
  const unlocks = tech.unlocks ?? [];
  const kind = kindOf(unlocks);
  const cost =
    tech.cost === 0
      ? 'Free'
      : `${tech.cost} ${tech.ancient ? 'ancient ' : ''}pt${tech.cost === 1 ? '' : 's'}`;

  return (
    <li
      id={tech.id}
      className={cn(
        'relative flex gap-3 overflow-hidden card p-3 pl-4 transition',
        highlight && 'ring-2 ring-pw-teal'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-1.5',
          tech.ancient ? 'bg-amber-500' : 'bg-pw-teal'
        )}
      />
      <span className="flex size-16 shrink-0 items-center justify-center self-start rounded-xl bg-pw-cream/70">
        {unlocks[0] ? (
          <UnlockIcon u={unlocks[0]} className="size-12" />
        ) : (
          <span aria-hidden="true" className="size-4 rotate-45 bg-pw-line" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-xl leading-tight">{tech.name}</h3>
          <span
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1',
              tech.ancient
                ? 'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-400/20 dark:text-amber-100 dark:ring-amber-400/40'
                : 'bg-pw-teal/15 text-pw-link ring-pw-teal/30'
            )}
          >
            <span
              aria-hidden="true"
              className="size-1.5 rotate-45 bg-current"
            />
            {cost}
          </span>
        </div>
        <p className="text-xs text-pw-muted">
          {kind ?? 'Nothing listed on the wiki'}
          {unlocks.length > 1 && ` · ${unlocks.length} unlocks`}
        </p>
        {tech.requires && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-pw-muted">
            <LockIcon className="size-3.5" />
            Needs: {tech.requires.replace(/\[\[|\]\]/g, '')}
          </p>
        )}
        {unlocks.length > 0 && <UnlockChips unlocks={unlocks} />}
      </div>
    </li>
  );
}

/** Category keys of everything a tech unlocks, for the "Unlocks" filter */
export function techCategoryKeys(tech: Tech): string[] {
  return [
    ...new Set(
      (tech.unlocks ?? []).map(
        (u) => unlockCategory(u.kind, resolve(u).type).key
      )
    ),
  ];
}
