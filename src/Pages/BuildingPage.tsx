import React from 'react';
import { Link, useParams } from 'react-router';
import ItemIcon from '../Components/ItemIcon';
import CategoryChips from '../Components/CategoryChips';
import LongList from '../Components/LongList';
import Tile from '../Components/Tile';
import { rarityColours } from '../Utils/rarity';
import { unlockCategory } from '../Utils/tech';
import { RecipeCard } from '../Components/gearUi';
import { groupRecipes } from '../Utils/crafting';
import { Breadcrumbs, Page, Panel, buttonClass, Stat } from '../Components/ui';
import NotFoundPage from './NotFoundPage';
import {
  buildingById,
  itemByName,
  recipesFor,
  recipesByStation,
  techByName,
} from '../data/gear';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { formatNumber } from '../Utils/text';
import type { Building } from '../types';

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <Stat label={label}>{children}</Stat>;
}

export default function BuildingPage() {
  const { id } = useParams();
  const building = buildingById.get(id ?? '');
  useDocumentTitle(building?.name);
  if (!building) return <NotFoundPage />;
  return <BuildingDetail building={building} />;
}

function BuildingDetail({ building }: { building: Building }) {
  const cost = recipesFor(building.name, 'building');
  const crafts = React.useMemo(() => {
    // what this workbench makes, grouped by product so quality variants sit together
    const byProduct = new Map<string, number>();
    for (const r of recipesByStation.get(building.name) ?? [])
      byProduct.set(r.product, (byProduct.get(r.product) ?? 0) + 1);
    return [...byProduct.keys()].sort((a, b) => a.localeCompare(b));
  }, [building.name]);
  const tech = building.tech ? techByName.get(building.tech) : undefined;

  return (
    <Page>
      <Breadcrumbs
        items={[
          { label: 'Buildings', to: '/buildings' },
          { label: building.name },
        ]}
      />
      <section className="flex flex-col items-center gap-5 card rounded-3xl bg-gradient-to-br from-pw-sun/15 to-transparent p-5 sm:flex-row sm:p-8">
        <ItemIcon
          kind="building"
          id={building.id}
          name={building.name}
          className="size-28"
        />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-sm font-semibold tracking-wide text-pw-muted">
            {[building.type, building.subtype].filter(Boolean).join(' · ')}
          </p>
          <h1 className="text-4xl sm:text-5xl">{building.name}</h1>
          {building.description && (
            <p className="mt-3 max-w-prose whitespace-pre-line text-pw-muted">
              {building.description}
            </p>
          )}
        </div>
      </section>

      <div className="mt-4 space-y-4">
        <Panel title="Details">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fact label="HP">{formatNumber(building.hp)}</Fact>
            <Fact label="Capacity">{formatNumber(building.capacity)}</Fact>
            <Fact label="Supports other buildings">
              {building.support ? 'Yes' : 'No'}
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
          </dl>
        </Panel>

        {cost.length > 0 && (
          <Panel
            title="Build cost"
            actions={
              <Link
                to={`/crafting?building=${building.id}`}
                className={buttonClass('accent', 'h-9')}
              >
                Raw materials
              </Link>
            }
          >
            <div className="space-y-3">
              {groupRecipes(cost).map((v, i) => (
                <RecipeCard key={i} recipe={v.recipe} stations={v.stations} />
              ))}
            </div>
          </Panel>
        )}

        {crafts.length > 0 && (
          <Panel title={`Crafts here (${crafts.length})`}>
            <CraftsList crafts={crafts} />
          </Panel>
        )}
      </div>
    </Page>
  );
}

const craftCategory = (name: string) =>
  unlockCategory('item', itemByName.get(name)?.type);

function CraftsList({ crafts }: { crafts: string[] }) {
  const [cat, setCat] = React.useState('');
  const shown = React.useMemo(
    () => (cat ? crafts.filter((n) => craftCategory(n).key === cat) : crafts),
    [crafts, cat]
  );
  return (
    <LongList
      items={shown}
      itemKey={(name) => name}
      text={(name) => name}
      noun="items"
      min="9rem"
      first={24}
      step={48}
      resetKey={cat}
      toolbar={
        <CategoryChips
          items={crafts}
          category={craftCategory}
          value={cat}
          onChange={setCat}
        />
      }
      renderItem={(name) => {
        const item = itemByName.get(name);
        return (
          <Tile
            to={item ? `/item/${item.id}` : undefined}
            className="h-full"
            accent={item?.rarity ? rarityColours[item.rarity] : undefined}
            icon={
              item && item.type !== 'Schematic' ? (
                <ItemIcon
                  id={item.id}
                  name={name}
                  rarity={item.rarity}
                  className="size-14"
                />
              ) : (
                <span className="font-display text-3xl font-bold text-pw-muted">
                  {name[0]}
                </span>
              )
            }
            title={name}
          />
        );
      }}
    />
  );
}
