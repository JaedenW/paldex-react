import React from 'react';
import { Link } from 'react-router';
import LongList from './LongList';
import PalImage from './PalImage';
import { RecipeCard } from './gearUi';
import { Chip, Panel, buttonClass } from './ui';
import { palById, pals } from '../data';
import {
  buildings,
  items,
  palDrops,
  recipesFor,
  sources,
  techByName,
} from '../data/gear';
import { createLinker } from '../Utils/linkify';
import { groupRecipes } from '../Utils/crafting';
import { formatNumber } from '../Utils/text';
import type { Item, ItemSources } from '../types';

// Pals, then buildings, then items: the first match for a name wins
const linkText = createLinker([
  ...pals.map((p) => ({ name: p.name, to: `/pal/${p.id}` })),
  ...buildings.map((b) => ({ name: b.name, to: `/building/${b.id}` })),
  ...items.map((i) => ({ name: i.name, to: `/item/${i.id}` })),
]);

const range = (min?: number | null, max?: number | null) =>
  min == null ? '' : min === max || max == null ? `×${min}` : `×${min}–${max}`;

function Sentence({ text, self }: { text: string; self: string }) {
  return (
    <>
      {linkText(text, self).map((seg, i) =>
        seg.to ? (
          <Link
            key={i}
            to={seg.to}
            className="font-semibold text-pw-link hover:underline"
          >
            {seg.text}
          </Link>
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        )
      )}
    </>
  );
}

function Group({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-baseline gap-2 text-lg text-pw-heading">
        {title}
        {count !== undefined && (
          <span className="text-sm font-normal text-pw-muted">{count}</span>
        )}
      </h3>
      {children}
    </section>
  );
}

const card =
  'flex items-center justify-between gap-3 rounded-xl border bg-pw-cream/30 px-3 py-2';

/**
 * Every way to get an item in one place: crafting, gathering and the other
 * notes on the wiki, Pal and enemy drops, merchants, and chests. A row of tags
 * at the top says which apply.
 */
export default function ItemAcquire({ item }: { item: Item }) {
  const recipes = groupRecipes(recipesFor(item.name));
  const where = sources[item.name];
  const palList = palDrops.get(item.name) ?? [];
  const palDrops_ = React.useMemo(() => groupByPal(palList), [palList]);
  const tech = item.tech ? techByName.get(item.tech) : undefined;

  const tags = [
    recipes.length > 0 && 'Craftable',
    where?.other && 'Gathered or found',
    palList.length > 0 && `Dropped by Pals (${groupByPal(palList).length})`,
    where?.dropped && `Enemy drop (${where.dropped.length})`,
    where?.shops && `Sold by merchants (${where.shops.length})`,
    where?.found && 'Found in chests',
  ].filter(Boolean) as string[];

  const nothing = tags.length === 0;

  return (
    <Panel title="How to get it">
      {nothing ? (
        <p className="text-pw-muted">
          The wiki doesn’t list a way to get this item. It may be unused,
          internal, or only obtained through something the wiki hasn’t recorded.
        </p>
      ) : (
        <ul className="mb-4 flex flex-wrap gap-2" aria-label="Ways to get it">
          {tags.map((t) => (
            <li
              key={t}
              className="rounded-full bg-pw-teal/15 px-3 py-1 text-sm font-semibold text-pw-link ring-1 ring-pw-teal/30"
            >
              {t}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-6">
        {recipes.length > 0 && (
          <Group title="Craft it" count={recipes.length}>
            {tech && (
              <p className="mb-2 text-sm text-pw-muted">
                Needs the{' '}
                <Link
                  to={`/technology?q=${encodeURIComponent(tech.name)}`}
                  className="font-semibold text-pw-link hover:underline"
                >
                  {tech.name}
                </Link>{' '}
                technology: level {tech.level}, {tech.cost}{' '}
                {tech.ancient ? 'ancient technology' : 'technology'} point
                {tech.cost === 1 ? '' : 's'}.
              </p>
            )}
            <div className="grid-fluid [--min:20rem]">
              {recipes.map((v, i) => (
                <RecipeCard key={i} recipe={v.recipe} stations={v.stations} />
              ))}
            </div>
            <Link
              to={`/crafting?item=${item.id}`}
              className={buttonClass('accent', 'mt-3 h-9')}
            >
              Total raw materials
            </Link>
          </Group>
        )}

        {where?.other && (
          <Group title="Gather or find">
            <ul className="grid-fluid [--min:20rem]">
              {where.other.map((line, i) => (
                <li
                  key={i}
                  className="rounded-xl border bg-pw-cream/30 px-3 py-2 text-pw-ink"
                >
                  <Sentence text={line} self={item.name} />
                </li>
              ))}
            </ul>
          </Group>
        )}

        {palList.length > 0 && (
          <Group title="Dropped by Pals" count={palDrops_.length}>
            <PalDrops drops={palList} />
          </Group>
        )}

        {where?.dropped && (
          <Group title="Dropped by enemies" count={where.dropped.length}>
            <EnemyDrops drops={where.dropped} />
          </Group>
        )}

        {where?.shops && (
          <Group title="Sold by" count={where.shops.length}>
            <ul className="grid-fluid [--min:15rem]">
              {where.shops.map((s, i) => (
                <li key={i} className={card}>
                  <span className="font-semibold">{s.merchant}</span>
                  <span className="shrink-0 text-sm text-pw-muted">
                    {s.cost !== undefined && (
                      <>
                        <b className="text-pw-ink">{formatNumber(s.cost)}</b>{' '}
                        {s.currency}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Group>
        )}

        {where?.found && (
          <Group title="Found in" count={where.found.length}>
            <FoundIn found={where.found} />
          </Group>
        )}

        {!recipes.length && tech && (
          <p className="text-sm text-pw-muted">
            It’s unlocked by the{' '}
            <Link
              to={`/technology?q=${encodeURIComponent(tech.name)}`}
              className="font-semibold text-pw-link hover:underline"
            >
              {tech.name}
            </Link>{' '}
            technology (level {tech.level}).
          </p>
        )}
      </div>
    </Panel>
  );
}

type PalDropRow = NonNullable<ReturnType<typeof palDrops.get>>[number];

interface PalDropGroup {
  palId: string;
  palName: string;
  normal?: PalDropRow;
  alpha?: PalDropRow;
}

/** A Pal's normal and Alpha drops of an item are one entry, not two */
function groupByPal(rows: PalDropRow[]): PalDropGroup[] {
  const groups = new Map<string, PalDropGroup>();
  for (const r of rows) {
    const g = groups.get(r.palId) ?? { palId: r.palId, palName: r.palName };
    if (r.alpha) g.alpha = r;
    else g.normal = r;
    groups.set(r.palId, g);
  }
  // Pals that drop it normally and most reliably first
  return [...groups.values()].sort(
    (a, b) =>
      (b.normal?.chance ?? -1) - (a.normal?.chance ?? -1) ||
      (b.alpha?.chance ?? -1) - (a.alpha?.chance ?? -1) ||
      a.palName.localeCompare(b.palName)
  );
}

const dropLine = (r: PalDropRow) => `${range(r.min, r.max)} · ${r.chance}%`;

function PalDrops({ drops }: { drops: PalDropRow[] }) {
  const groups = React.useMemo(() => groupByPal(drops), [drops]);
  const [kind, setKind] = React.useState<'all' | 'normal' | 'alpha'>('all');
  const normalCount = groups.filter((g) => g.normal).length;
  const alphaOnly = groups.filter((g) => !g.normal).length;
  const shown = groups.filter(
    (g) => kind === 'all' || (kind === 'normal' ? g.normal : !g.normal)
  );

  return (
    <LongList
      items={shown}
      itemKey={(g) => g.palId}
      text={(g) => g.palName}
      noun="Pals"
      min="16rem"
      resetKey={kind}
      toolbar={
        alphaOnly > 0 && normalCount > 0 ? (
          <>
            <Chip active={kind === 'all'} onClick={() => setKind('all')}>
              All ({groups.length})
            </Chip>
            <Chip active={kind === 'normal'} onClick={() => setKind('normal')}>
              Regular drop ({normalCount})
            </Chip>
            <Chip active={kind === 'alpha'} onClick={() => setKind('alpha')}>
              Alpha only ({alphaOnly})
            </Chip>
          </>
        ) : undefined
      }
      renderItem={(g) => {
        const pal = palById.get(g.palId);
        return (
          <Link
            to={`/pal/${g.palId}?tab=drops`}
            className={`${card} h-full transition hover:border-pw-teal`}
          >
            <span className="flex min-w-0 items-center gap-2">
              {pal && <PalImage pal={pal} className="size-9 shrink-0" />}
              <span className="block truncate font-semibold">{g.palName}</span>
            </span>
            <span className="shrink-0 text-right text-xs leading-snug text-pw-muted">
              {g.normal && <span className="block">{dropLine(g.normal)}</span>}
              {g.alpha && (
                <span className="block">
                  <b className="text-pw-ink">Alpha</b> {dropLine(g.alpha)}
                </span>
              )}
            </span>
          </Link>
        );
      }}
    />
  );
}

type Dropped = NonNullable<ItemSources['dropped']>;

function EnemyDrops({ drops }: { drops: Dropped }) {
  const types = [...new Set(drops.map((d) => d.type))].sort();
  const [type, setType] = React.useState('');
  const shown = React.useMemo(
    () =>
      drops
        .filter((d) => !type || d.type === type)
        .sort(
          (a, b) =>
            (b.chance ?? 0) - (a.chance ?? 0) ||
            a.target.localeCompare(b.target)
        ),
    [drops, type]
  );
  return (
    <LongList
      items={shown}
      itemKey={(d) => `${d.target}|${d.variant ?? ''}|${d.type}`}
      text={(d) => `${d.target} ${d.variant ?? ''}`}
      noun="enemies"
      min="15rem"
      resetKey={type}
      toolbar={
        types.length > 1 ? (
          <>
            <Chip active={!type} onClick={() => setType('')}>
              All ({drops.length})
            </Chip>
            {types.map((t) => (
              <Chip
                key={t}
                active={type === t}
                onClick={() => setType(type === t ? '' : t)}
              >
                {t} ({drops.filter((d) => d.type === t).length})
              </Chip>
            ))}
          </>
        ) : undefined
      }
      renderItem={(d) => (
        <div className={`${card} h-full`}>
          <span className="min-w-0">
            <span className="block truncate font-semibold">
              {d.target}
              {d.variant ? ` (${d.variant})` : ''}
            </span>
            <span className="text-xs text-pw-muted">{d.type}</span>
          </span>
          <span className="shrink-0 text-right text-sm text-pw-muted">
            {range(d.min, d.max)}
            {d.chance !== undefined && (
              <>
                <br />
                <b className="text-pw-ink">{d.chance}%</b>
              </>
            )}
          </span>
        </div>
      )}
    />
  );
}

type Found = NonNullable<ItemSources['found']>;

function FoundIn({ found }: { found: Found }) {
  const categories = [...new Set(found.map((f) => f.category))].sort();
  const [category, setCategory] = React.useState('');
  const shown = React.useMemo(
    () =>
      found
        .filter((f) => !category || f.category === category)
        .sort((a, b) => (b.chance ?? 0) - (a.chance ?? 0)),
    [found, category]
  );
  return (
    <LongList
      items={shown}
      itemKey={(f) => `${f.category}|${f.label}`}
      text={(f) => `${f.label} ${f.category}`}
      noun="places"
      min="17rem"
      resetKey={category}
      toolbar={
        categories.length > 1 ? (
          <>
            <Chip active={!category} onClick={() => setCategory('')}>
              All ({found.length})
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c}
                active={category === c}
                onClick={() => setCategory(category === c ? '' : c)}
              >
                {c} ({found.filter((f) => f.category === c).length})
              </Chip>
            ))}
          </>
        ) : undefined
      }
      renderItem={(f) => (
        <div className={`${card} h-full`}>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{f.label}</span>
            <span className="text-xs text-pw-muted">{f.category}</span>
          </span>
          <span className="shrink-0 text-right text-sm text-pw-muted">
            {range(f.min, f.max)}
            {f.chance !== undefined && (
              <>
                <br />
                <b className="text-pw-ink">{f.chance}%</b>
              </>
            )}
          </span>
        </div>
      )}
    />
  );
}
