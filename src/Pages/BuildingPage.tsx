import React from 'react';
import { Link, useParams } from 'react-router';
import ItemIcon from '../Components/ItemIcon';
import { ItemLink, RecipeCard } from '../Components/gearUi';
import { groupRecipes } from '../Utils/crafting';
import { Breadcrumb, Page, Panel, buttonClass } from '../Components/ui';
import NotFoundPage from './NotFoundPage';
import {
  buildingById,
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
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-pw-muted uppercase">
        {label}
      </dt>
      <dd className="font-display text-xl font-bold">{children}</dd>
    </div>
  );
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
      <Breadcrumb to="/buildings" label="Buildings" />
      <section className="flex flex-col items-center gap-5 rounded-3xl border bg-pw-paper p-5 shadow-card sm:flex-row sm:p-8">
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
            <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {crafts.map((name) => (
                <li key={name}>
                  <ItemLink name={name} />
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </Page>
  );
}
