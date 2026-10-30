import React from 'react';
import { Link, useParams } from 'react-router';
import ItemIcon from '../Components/ItemIcon';
import CategoryChips from '../Components/CategoryChips';
import LongList from '../Components/LongList';
import { ItemLink, RarityBadge, StationLink } from '../Components/gearUi';
import ItemAcquire from '../Components/ItemAcquire';
import { Breadcrumbs, Page, Panel, Stat } from '../Components/ui';
import { rarityColours } from '../Utils/rarity';
import { unlockCategory } from '../Utils/tech';
import NotFoundPage from './NotFoundPage';
import {
  itemById,
  recipesUsing,
  techByName,
  buildingByName,
  itemByName,
} from '../data/gear';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { formatNumber } from '../Utils/text';
import type { GearStats, Item, Recipe } from '../types';

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

export default function ItemPage() {
  const { id } = useParams();
  const item = itemById.get(id ?? '');
  useDocumentTitle(item?.name);
  if (!item) return <NotFoundPage />;
  return <ItemDetail item={item} />;
}

function ItemDetail({ item }: { item: Item }) {
  // the same use at several benches is one row, listing the benches
  const uses = React.useMemo(() => {
    const merged = new Map<
      string,
      { recipe: Recipe; stations: string[]; qty: number }
    >();
    for (const r of recipesUsing.get(item.name) ?? []) {
      const qty = r.ingredients.find((x) => x.name === item.name)?.qty ?? 0;
      const key = `${r.kind}|${r.product}|${r.quality ?? ''}|${qty}`;
      const row = merged.get(key) ?? { recipe: r, stations: [], qty };
      if (r.station && !row.stations.includes(r.station))
        row.stations.push(r.station);
      merged.set(key, row);
    }
    return [...merged.values()];
  }, [item.name]);
  const tech = item.tech ? techByName.get(item.tech) : undefined;
  const columns = GEAR_COLUMNS.filter((c) =>
    item.gear?.some((g) => g[c.key] !== undefined)
  );

  return (
    <Page>
      <Breadcrumbs
        items={[{ label: 'Items', to: '/items' }, { label: item.name }]}
      />

      <section
        className="relative flex flex-col items-center gap-5 overflow-hidden card rounded-3xl p-5 sm:flex-row sm:p-8"
        style={{
          backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${rarityColours[item.rarity ?? 'Common']} 22%, transparent), transparent 55%)`,
        }}
      >
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
            <Stat label="Weight">{formatNumber(item.weight, 2)}</Stat>
            <Stat label="Sell value">
              {item.sell ? formatNumber(item.sell) : '–'}
            </Stat>
            <Stat label="Unlocked by">
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
            </Stat>
            {item.food && (
              <Stat label="Nutrition">
                {formatNumber(item.food.nutrition, 1)}
              </Stat>
            )}
          </dl>
          {item.food &&
            (item.food.effect || item.food.sanity !== undefined) && (
              <dl className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
                {item.food.sanity !== undefined && (
                  <Stat label="Sanity">
                    {formatNumber(item.food.sanity, 1)}
                  </Stat>
                )}
                {item.food.effect && (
                  <Stat label="Effect">{item.food.effect}</Stat>
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

        <ItemAcquire item={item} />

        {uses.length > 0 && (
          <Panel
            title={`Used in ${uses.length} recipe${uses.length === 1 ? '' : 's'}`}
          >
            <UsedIn uses={uses} itemName={item.name} />
          </Panel>
        )}
      </div>
    </Page>
  );
}

type Use = { recipe: Recipe; stations: string[]; qty: number };

/** What a recipe makes, as a category: Weapons, Materials, Buildings: Production… */
function productCategory(r: Recipe) {
  return r.kind === 'building'
    ? unlockCategory('building', buildingByName.get(r.product)?.type)
    : unlockCategory('item', itemByName.get(r.product)?.type);
}

/** The chips group every building together; the row still says which kind */
const productGroup = (r: Recipe) =>
  r.kind === 'building'
    ? { key: 'buildings', label: 'Buildings' }
    : productCategory(r);

function UsedIn({ uses, itemName }: { uses: Use[]; itemName: string }) {
  const [cat, setCat] = React.useState('');
  const shown = React.useMemo(
    () =>
      cat ? uses.filter((u) => productCategory(u.recipe).key === cat) : uses,
    [uses, cat]
  );
  return (
    <LongList
      items={shown}
      itemKey={(u) =>
        `${u.recipe.kind}|${u.recipe.product}|${u.recipe.quality ?? ''}|${u.qty}`
      }
      text={(u) => u.recipe.product}
      noun="recipes"
      min="16rem"
      resetKey={`${itemName}|${cat}`}
      toolbar={
        <CategoryChips
          items={uses}
          category={(u) => productGroup(u.recipe)}
          value={cat}
          onChange={setCat}
        />
      }
      renderItem={({ recipe: r, stations, qty }) => (
        <div className="flex h-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border bg-pw-cream/30 px-3 py-2">
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              {r.kind === 'item' ? (
                <ItemLink name={r.product} />
              ) : (
                <StationLink name={r.product} />
              )}
              <RarityBadge rarity={r.quality} />
            </span>
            <span className="text-xs text-pw-muted">
              {productCategory(r).label}
            </span>
          </span>
          <span className="text-sm text-pw-muted">
            ×{qty}
            {stations.length > 0 ? (
              <>
                {' '}
                at <StationLink name={stations[0]} />
                {stations.length > 1 && ` and ${stations.length - 1} more`}
              </>
            ) : r.kind === 'building' ? (
              ' (building)'
            ) : (
              ''
            )}
          </span>
        </div>
      )}
    />
  );
}
