import React from 'react';
import { Link, useParams } from 'react-router';
import ItemIcon from '../Components/ItemIcon';
import InfiniteSentinel from '../Components/InfiniteSentinel';
import { useInfiniteScroll } from '../Hooks/useInfiniteScroll';
import {
  ItemLink,
  RarityBadge,
  RecipeCard,
  StationLink,
} from '../Components/gearUi';
import { groupRecipes } from '../Utils/crafting';
import { Breadcrumb, Page, Panel, buttonClass } from '../Components/ui';
import NotFoundPage from './NotFoundPage';
import {
  itemById,
  palDrops,
  recipesFor,
  recipesUsing,
  sources,
  techByName,
} from '../data/gear';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { formatNumber } from '../Utils/text';
import type { GearStats, Item } from '../types';

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-pw-muted uppercase">
        {label}
      </dt>
      <dd className="font-display text-xl font-bold">{children}</dd>
    </div>
  );
}

const GEAR_COLUMNS: { key: keyof GearStats; label: string }[] = [
  { key: 'attack', label: 'Attack' },
  { key: 'defense', label: 'Defense' },
  { key: 'durability', label: 'Durability' },
  { key: 'health', label: 'Health' },
  { key: 'shield', label: 'Shield' },
  { key: 'glider', label: 'Glider speed' },
  { key: 'stamina', label: 'Stamina drain' },
  { key: 'capture', label: 'Capture power' },
  { key: 'sell', label: 'Sells for' },
];

const range = (min?: number, max?: number) =>
  min === undefined
    ? ''
    : min === max || max === undefined
      ? `×${min}`
      : `×${min}–${max}`;

export default function ItemPage() {
  const { id } = useParams();
  const item = itemById.get(id ?? '');
  useDocumentTitle(item?.name);
  if (!item) return <NotFoundPage />;
  return <ItemDetail item={item} />;
}

function ItemDetail({ item }: { item: Item }) {
  const made = recipesFor(item.name);
  const uses = recipesUsing.get(item.name) ?? [];
  const where = sources[item.name];
  const pals = palDrops.get(item.name) ?? [];
  const tech = item.tech ? techByName.get(item.tech) : undefined;
  const columns = GEAR_COLUMNS.filter((c) =>
    item.gear?.some((g) => g[c.key] !== undefined)
  );
  const {
    limit: usesLimit,
    hasMore: moreUses,
    sentinelRef: usesSentinel,
    showAll: showAllUses,
  } = useInfiniteScroll(uses.length, 12, item.id);
  const usesShown = uses.slice(0, usesLimit);

  return (
    <Page>
      <Breadcrumb to="/items" label="Items" />

      <section className="flex flex-col items-center gap-5 rounded-3xl border bg-pw-paper p-5 shadow-card sm:flex-row sm:p-8">
        {item.type !== 'Schematic' && (
          <ItemIcon
            id={item.id}
            name={item.name}
            rarity={item.rarity}
            className="size-28"
          />
        )}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-sm font-semibold tracking-wide text-pw-muted">
            {item.type}
            {item.subtype ? ` · ${item.subtype}` : ''}
          </p>
          <h1 className="text-4xl sm:text-5xl">{item.name}</h1>
          <div className="mt-2 flex justify-center gap-2 sm:justify-start">
            <RarityBadge rarity={item.rarity} />
          </div>
          {item.description && (
            <p className="mt-3 max-w-prose whitespace-pre-line text-pw-muted">
              {item.description}
            </p>
          )}
        </div>
      </section>

      <div className="mt-4 space-y-4">
        <Panel title="Details">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fact label="Weight">{formatNumber(item.weight, 2)}</Fact>
            <Fact label="Sell value">
              {item.sell ? formatNumber(item.sell) : '–'}
            </Fact>
            <Fact label="Unlocked by">
              {tech ? (
                <Link
                  to={`/technology?q=${encodeURIComponent(tech.name)}`}
                  className="hover:underline"
                >
                  {tech.name}{' '}
                  <span className="text-sm font-semibold text-pw-muted">
                    (Lv. {tech.level})
                  </span>
                </Link>
              ) : (
                '–'
              )}
            </Fact>
            {item.food && (
              <Fact label="Nutrition">
                {formatNumber(item.food.nutrition, 1)}
              </Fact>
            )}
          </dl>
          {item.food &&
            (item.food.effect || item.food.sanity !== undefined) && (
              <dl className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
                {item.food.sanity !== undefined && (
                  <Fact label="Sanity">
                    {formatNumber(item.food.sanity, 1)}
                  </Fact>
                )}
                {item.food.effect && (
                  <Fact label="Effect">{item.food.effect}</Fact>
                )}
              </dl>
            )}
        </Panel>

        {item.gear && item.gear.length > 0 && (
          <Panel title="Stats by quality">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left">
                <thead>
                  <tr className="text-xs tracking-wide text-pw-muted uppercase">
                    <th className="py-1 pr-3 font-semibold">Quality</th>
                    {columns.map((c) => (
                      <th
                        key={c.key}
                        className="px-2 py-1 text-right font-semibold"
                      >
                        {c.label}
                      </th>
                    ))}
                    <th className="py-1 pl-3 font-semibold">Effect</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {item.gear.map((g, i) => (
                    <tr key={g.quality ?? i}>
                      <td className="py-2 pr-3">
                        <RarityBadge rarity={g.quality} />
                      </td>
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className="px-2 py-2 text-right font-display text-lg font-bold"
                        >
                          {formatNumber(g[c.key] as number | undefined)}
                        </td>
                      ))}
                      <td className="py-2 pl-3 text-sm whitespace-pre-line text-pw-muted">
                        {g.effect ?? ''}
                        {g.ammo ? `Ammo: ${g.ammo}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {made.length > 0 && (
          <Panel
            title="How to craft"
            actions={
              <Link
                to={`/crafting?item=${item.id}`}
                className={buttonClass('accent', 'h-9')}
              >
                Raw materials
              </Link>
            }
          >
            <div className="space-y-3">
              {groupRecipes(made).map((v, i) => (
                <RecipeCard key={i} recipe={v.recipe} stations={v.stations} />
              ))}
            </div>
          </Panel>
        )}

        {(pals.length > 0 ||
          where?.dropped ||
          where?.shops ||
          where?.found) && (
          <Panel title="Where to get it">
            <div className="space-y-5">
              {pals.length > 0 && (
                <section>
                  <h3 className="mb-1 text-lg text-pw-navy">Dropped by Pals</h3>
                  <ul className="divide-y">
                    {pals.map((p) => (
                      <li
                        key={`${p.palId}${p.alpha}`}
                        className="flex items-center justify-between gap-3 py-1.5"
                      >
                        <Link
                          to={`/pal/${p.palId}?tab=drops`}
                          className="font-semibold hover:underline"
                        >
                          {p.palName}
                          {p.alpha && (
                            <span className="ml-2 rounded-full bg-pw-deep px-2 py-0.5 text-xs text-white">
                              Alpha
                            </span>
                          )}
                        </Link>
                        <span className="text-sm text-pw-muted">
                          {range(p.min ?? undefined, p.max ?? undefined)} ·{' '}
                          {p.chance}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {where?.dropped && (
                <section>
                  <h3 className="mb-1 text-lg text-pw-navy">
                    Dropped by enemies
                  </h3>
                  <ul className="divide-y">
                    {where.dropped.map((d, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 py-1.5"
                      >
                        <span className="font-semibold">
                          {d.target}
                          {d.variant ? ` (${d.variant})` : ''}{' '}
                          <span className="text-sm font-normal text-pw-muted">
                            {d.type}
                          </span>
                        </span>
                        <span className="text-sm text-pw-muted">
                          {range(d.min, d.max)}
                          {d.chance !== undefined ? ` · ${d.chance}%` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {where?.shops && (
                <section>
                  <h3 className="mb-1 text-lg text-pw-navy">Sold by</h3>
                  <ul className="divide-y">
                    {where.shops.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 py-1.5"
                      >
                        <span className="font-semibold">{s.merchant}</span>
                        <span className="text-sm text-pw-muted">
                          {s.cost !== undefined
                            ? `${formatNumber(s.cost)} ${s.currency ?? ''}`
                            : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {where?.found && (
                <section>
                  <h3 className="mb-1 text-lg text-pw-navy">Found in</h3>
                  <ul className="divide-y">
                    {[...where.found]
                      .sort((a, b) => (b.chance ?? 0) - (a.chance ?? 0))
                      .slice(0, 15)
                      .map((f, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between gap-3 py-1.5"
                        >
                          <span>
                            <span className="font-semibold">{f.label}</span>{' '}
                            <span className="text-sm text-pw-muted">
                              {f.category}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm text-pw-muted">
                            {range(f.min, f.max)}
                            {f.chance !== undefined ? ` · ${f.chance}%` : ''}
                          </span>
                        </li>
                      ))}
                  </ul>
                </section>
              )}
            </div>
          </Panel>
        )}

        {uses.length > 0 && (
          <Panel
            title={`Used in ${uses.length} recipe${uses.length === 1 ? '' : 's'}`}
          >
            <ul className="divide-y">
              {usesShown.map((r, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2"
                >
                  <span className="flex items-center gap-2">
                    {r.kind === 'item' ? (
                      <ItemLink name={r.product} />
                    ) : (
                      <Link
                        to={`/buildings?q=${encodeURIComponent(r.product)}`}
                        className="font-semibold hover:underline"
                      >
                        {r.product}
                      </Link>
                    )}
                    <RarityBadge rarity={r.quality} />
                  </span>
                  <span className="text-sm text-pw-muted">
                    ×{r.ingredients.find((x) => x.name === item.name)?.qty}
                    {r.station ? (
                      <>
                        {' '}
                        at <StationLink name={r.station} />
                      </>
                    ) : r.kind === 'building' ? (
                      ' (building)'
                    ) : (
                      ''
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <InfiniteSentinel
              sentinelRef={usesSentinel}
              hasMore={moreUses}
              showAll={showAllUses}
            />
          </Panel>
        )}
      </div>
    </Page>
  );
}
