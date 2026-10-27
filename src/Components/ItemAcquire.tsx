import React from 'react';
import { Link } from 'react-router';
import PalImage from './PalImage';
import { RecipeCard } from './gearUi';
import { Panel, buttonClass } from './ui';
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
import type { Item } from '../types';

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
  const tech = item.tech ? techByName.get(item.tech) : undefined;
  const found = React.useMemo(
    () =>
      [...(where?.found ?? [])]
        .sort((a, b) => (b.chance ?? 0) - (a.chance ?? 0))
        .slice(0, 24),
    [where]
  );

  const tags = [
    recipes.length > 0 && 'Craftable',
    where?.other && 'Gathered or found',
    palList.length > 0 && `Pal drop (${palList.length})`,
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
          <Group title="Dropped by Pals" count={palList.length}>
            <ul className="grid-fluid [--min:15rem]">
              {palList.map((p) => {
                const pal = palById.get(p.palId);
                return (
                  <li key={`${p.palId}${p.alpha}`}>
                    <Link
                      to={`/pal/${p.palId}?tab=drops`}
                      className={`${card} transition hover:border-pw-teal`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {pal && (
                          <PalImage pal={pal} className="size-9 shrink-0" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {p.palName}
                          </span>
                          {p.alpha && (
                            <span className="text-xs text-pw-muted">Alpha</span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-sm text-pw-muted">
                        {range(p.min, p.max)}
                        <br />
                        <b className="text-pw-ink">{p.chance}%</b>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Group>
        )}

        {where?.dropped && (
          <Group title="Dropped by enemies" count={where.dropped.length}>
            <ul className="grid-fluid [--min:15rem]">
              {where.dropped.map((d, i) => (
                <li key={i} className={card}>
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
                </li>
              ))}
            </ul>
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

        {found.length > 0 && (
          <Group title="Found in" count={where?.found?.length}>
            <ul className="grid-fluid [--min:17rem]">
              {found.map((f, i) => (
                <li key={i} className={card}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {f.label}
                    </span>
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
                </li>
              ))}
            </ul>
            {(where?.found?.length ?? 0) > found.length && (
              <p className="mt-2 text-xs text-pw-muted">
                Showing the {found.length} best chances.
              </p>
            )}
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
