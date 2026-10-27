import React from 'react';
import { Link } from 'react-router';
import CraftFlow from '../Components/CraftFlow';
import ItemIcon from '../Components/ItemIcon';
import { ItemLink, StationLink } from '../Components/gearUi';
import {
  Page,
  PageHeader,
  Panel,
  Chip,
  EmptyState,
  Select,
} from '../Components/ui';
import {
  buildingById,
  buildings,
  itemById,
  items,
  recipesFor,
} from '../data/gear';
import { useQueryState } from '../Hooks/useQueryState';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { planCrafting, type CraftStep } from '../Utils/crafting';
import { matchScore } from '../Utils/search';
import { formatNumber } from '../Utils/text';
import type { Recipe } from '../types';

interface Target {
  kind: 'item' | 'building';
  id: string;
  name: string;
}

// Everything that has a recipe to expand
const targets: Target[] = [
  ...items
    .filter((i) => recipesFor(i.name).length > 0 && i.type !== 'Schematic')
    .map((i) => ({ kind: 'item' as const, id: i.id, name: i.name })),
  ...buildings
    .filter((b) => recipesFor(b.name, 'building').length > 0)
    .map((b) => ({ kind: 'building' as const, id: b.id, name: b.name })),
];

export default function CraftingPage() {
  useDocumentTitle('Crafting calculator');
  const [itemParam, setItem] = useQueryState('item');
  const [buildingParam, setBuilding] = useQueryState('building');
  const [qtyParam, setQty] = useQueryState('qty', '1');
  const [expandParam, setExpand] = useQueryState('expand', '1');
  const [view, setView] = useQueryState('view', 'flow');
  const [query, setQuery] = React.useState('');
  // which way to make each product when there are several, by variant index
  const [choices, setChoices] = React.useState<Record<string, number>>({});

  const item = itemParam ? itemById.get(itemParam) : undefined;
  const building = buildingParam ? buildingById.get(buildingParam) : undefined;
  const target: Target | undefined = building
    ? { kind: 'building', id: building.id, name: building.name }
    : item
      ? { kind: 'item', id: item.id, name: item.name }
      : undefined;
  const qty = Math.min(9999, Math.max(1, Math.floor(Number(qtyParam)) || 1));
  const expand = expandParam !== '0';

  const suggestions = React.useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return targets
      .map((t) => ({ t, score: matchScore(t.name, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.t.name.localeCompare(b.t.name))
      .slice(0, 8)
      .map((x) => x.t);
  }, [query]);

  const choose = (t: Target) => {
    // one URL parameter at a time keeps item and building from both being set
    setItem(t.kind === 'item' ? t.id : '');
    setBuilding(t.kind === 'building' ? t.id : '');
    setQuery('');
    setChoices({});
  };

  const plan = React.useMemo(() => {
    if (!target) return undefined;
    // the building's own recipe is under "building"; everything it needs is an item
    const recipesOf = (name: string) =>
      recipesFor(
        name,
        name === target.name && target.kind === 'building' ? 'building' : 'item'
      );
    return planCrafting(target.name, qty, {
      recipesOf,
      expand,
      choose: (name) => choices[name] ?? 0,
    });
  }, [target, qty, expand, choices]);

  return (
    <Page>
      <PageHeader
        eyebrow="Items & Base"
        title="Crafting calculator"
        subtitle="Pick something to make and see every material it needs, down to what you have to gather, plus the benches along the way."
      />

      <Panel className="mb-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <div className="relative">
            <label
              htmlFor="craft-search"
              className="mb-1 block text-xs font-semibold tracking-wide text-pw-muted uppercase"
            >
              Item or building
            </label>
            <input
              id="craft-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && suggestions[0] && choose(suggestions[0])
              }
              placeholder={
                target
                  ? `${target.name} (search to change)`
                  : 'Search for something to craft'
              }
              autoComplete="off"
              className="h-11 w-full rounded-full border bg-pw-field px-4 outline-none focus:border-pw-teal"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border bg-pw-paper p-1 shadow-lift">
                {suggestions.map((t) => (
                  <li key={`${t.kind}${t.id}`}>
                    <button
                      type="button"
                      onClick={() => choose(t)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left hover:bg-pw-cream"
                    >
                      <ItemIcon
                        kind={t.kind}
                        id={t.id}
                        name={t.name}
                        className="size-8"
                      />
                      <span className="flex-1 font-semibold">{t.name}</span>
                      <span className="text-xs text-pw-muted">
                        {t.kind === 'building'
                          ? 'Building'
                          : itemById.get(t.id)?.type}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label
              htmlFor="craft-qty"
              className="mb-1 block text-xs font-semibold tracking-wide text-pw-muted uppercase"
            >
              Quantity
            </label>
            <input
              id="craft-qty"
              type="number"
              min={1}
              max={9999}
              value={qtyParam}
              onChange={(e) => setQty(e.target.value)}
              className="h-11 w-full rounded-full border bg-pw-field px-4 outline-none focus:border-pw-teal"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip active={expand} onClick={() => setExpand(expand ? '0' : '1')}>
            {expand ? 'Breaking down every ingredient' : 'First level only'}
          </Chip>
          <span className="text-sm text-pw-muted">
            Uses the base (Common) recipe; schematic upgrades aren’t included.
          </span>
        </div>
      </Panel>

      {!target || !plan ? (
        <EmptyState title="Choose something to craft">
          Try Pal Sphere, Advanced Bow or Production Assembly Line.
        </EmptyState>
      ) : plan.steps.length === 0 ? (
        <EmptyState title={`${target.name} has no recipe`}>
          It can’t be crafted, so it has to be found or bought.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <section className="flex items-center gap-4 rounded-2xl bg-pw-navy p-4 text-white">
            <ItemIcon
              kind={target.kind}
              id={target.id}
              name={target.name}
              className="size-14"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-white/60 uppercase">
                Making
              </p>
              <p className="font-display text-3xl font-bold">
                {qty} × {target.name}
              </p>
            </div>
            <Link
              to={
                target.kind === 'item'
                  ? `/item/${target.id}`
                  : `/building/${target.id}`
              }
              className="text-sm font-semibold text-pw-sun hover:underline"
            >
              Details
            </Link>
          </section>

          <div
            className="flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="How to show the plan"
          >
            <Chip
              role="tab"
              aria-selected={view === 'flow'}
              active={view === 'flow'}
              onClick={() => setView('flow')}
            >
              Flow
            </Chip>
            <Chip
              role="tab"
              aria-selected={view === 'list'}
              active={view === 'list'}
              onClick={() => setView('list')}
            >
              List
            </Chip>
            <span className="text-sm text-pw-muted">
              {view === 'flow'
                ? 'Raw materials on the left, through each component, to the finished item. Hover a box to trace it.'
                : 'Raw materials, then each step in order.'}
            </span>
          </div>

          {view === 'flow' ? (
            <Panel title="From raw materials to the finished item">
              <CraftFlow
                plan={plan}
                target={target}
                onChoose={(product, v) =>
                  setChoices((cur) => ({ ...cur, [product]: v }))
                }
              />
            </Panel>
          ) : (
            <>
              <Panel title="Raw materials">
                <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  {plan.raw.map((r) => (
                    <li
                      key={r.name}
                      className="flex items-center justify-between gap-2 rounded-xl bg-pw-cream/70 px-3 py-2"
                    >
                      <ItemLink name={r.name} />
                      <span className="font-display text-xl font-bold">
                        {formatNumber(r.qty)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title={`Crafting steps (${plan.steps.length})`}>
                <p className="mb-3 text-sm text-pw-muted">
                  In order: each step uses the ones above it.
                </p>
                <ol className="divide-y">
                  {plan.steps.map((s, i) => (
                    <StepRow
                      key={s.product}
                      index={i + 1}
                      step={s}
                      kind={s.product === target.name ? target.kind : 'item'}
                      onChoose={(v) =>
                        setChoices((cur) => ({ ...cur, [s.product]: v }))
                      }
                    />
                  ))}
                </ol>
              </Panel>
            </>
          )}

          {plan.stations.length > 0 && (
            <Panel title="Workbenches needed">
              <ul className="flex flex-wrap gap-2">
                {plan.stations.map((group) => (
                  <li
                    key={group.join('|')}
                    className="rounded-full bg-pw-cream px-3 py-1"
                  >
                    <Stations names={group} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </Page>
  );
}

/** "A", or "A or B" when several benches make it the same way */
function Stations({ names }: { names: string[] }) {
  return (
    <>
      {names.map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && <span className="text-pw-muted"> or </span>}
          <StationLink name={n} />
        </React.Fragment>
      ))}
    </>
  );
}

const summary = (r: Recipe) =>
  r.ingredients.map((i) => `${i.qty} ${i.name}`).join(', ');

function StepRow({
  index,
  step,
  kind,
  onChoose,
}: {
  index: number;
  step: CraftStep;
  kind: 'item' | 'building';
  onChoose: (variant: number) => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-pw-sun font-display text-sm font-bold text-pw-deep">
        {index}
      </span>
      <ItemLink name={step.product} />
      <span className="text-sm text-pw-muted">
        craft {step.batches}×
        {step.recipe.qty > 1
          ? ` (makes ${step.made}, need ${step.needed})`
          : ''}
      </span>
      <span className="ml-auto text-sm">
        {step.stations.length > 0 ? (
          <Stations names={step.stations} />
        ) : (
          <span className="text-pw-muted">
            {kind === 'building' ? 'Build menu' : ''}
          </span>
        )}
      </span>
      {step.variants.length > 1 && (
        <div className="flex basis-full items-center gap-2 pl-9 text-sm">
          <span className="text-pw-muted">Recipe</span>
          <Select
            label={`Recipe for ${step.product}`}
            value={String(step.variantIndex)}
            onChange={(v) => onChoose(Number(v))}
            options={step.variants.map((v, i) => ({
              value: String(i),
              label: summary(v.recipe),
            }))}
            className="min-w-0"
            triggerClassName="h-8 text-sm"
          />
        </div>
      )}
    </li>
  );
}
