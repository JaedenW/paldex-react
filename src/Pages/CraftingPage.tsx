import React from 'react';
import { Link } from 'react-router';
import CraftFlow from '../Components/CraftFlow';
import WorkbenchCards from '../Components/WorkbenchCards';
import Combobox from '../Components/Combobox';
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
  techByName,
} from '../data/gear';
import { useCraftPlan } from '../Hooks/useCraftPlan';
import { useQueryPatch, useQueryState } from '../Hooks/useQueryState';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import {
  recipeSummary,
  type CraftStep,
  type CraftTarget,
} from '../Utils/crafting';
import { matchScore } from '../Utils/search';
import { formatNumber } from '../Utils/text';

// Everything that has a recipe to expand
const targets: CraftTarget[] = [
  ...items
    .filter((i) => recipesFor(i.name).length > 0 && i.type !== 'Schematic')
    .map((i) => ({ kind: 'item' as const, id: i.id, name: i.name })),
  ...buildings
    .filter((b) => recipesFor(b.name, 'building').length > 0)
    .map((b) => ({ kind: 'building' as const, id: b.id, name: b.name })),
];

function suggestTargets(query: string) {
  return targets
    .map((t) => ({ t, score: matchScore(t.name, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.t.name.localeCompare(b.t.name))
    .slice(0, 8)
    .map((x) => x.t);
}

export default function CraftingPage() {
  useDocumentTitle('Crafting calculator');
  const [itemParam] = useQueryState('item');
  const [buildingParam] = useQueryState('building');
  const patch = useQueryPatch();
  const [qtyParam, setQty] = useQueryState('qty', '1');
  const [expandParam, setExpand] = useQueryState('expand', '1');
  const [view, setView] = useQueryState('view', 'flow');

  const target = React.useMemo((): CraftTarget | undefined => {
    const building = buildingById.get(buildingParam);
    if (building)
      return { kind: 'building', id: building.id, name: building.name };
    const item = itemById.get(itemParam);
    return item && { kind: 'item', id: item.id, name: item.name };
  }, [itemParam, buildingParam]);
  const qty = Math.min(9999, Math.max(1, Math.floor(Number(qtyParam)) || 1));
  const expand = expandParam !== '0';

  const choose = (t: CraftTarget) => {
    // one update, so setting the item doesn't get overwritten by clearing the building
    patch({
      item: t.kind === 'item' ? t.id : undefined,
      building: t.kind === 'building' ? t.id : undefined,
    });
  };

  const { plan, choose: chooseRecipe } = useCraftPlan(target, qty, expand);
  const techName = target
    ? (target.kind === 'item'
        ? itemById.get(target.id)
        : buildingById.get(target.id)
      )?.tech
    : undefined;
  const tech = techName ? techByName.get(techName) : undefined;

  return (
    <Page>
      <PageHeader
        eyebrow="Items & Base"
        title="Crafting calculator"
        subtitle="Pick something to make and see every material it needs, down to what you have to gather, plus the benches along the way."
      />

      <Panel className="mb-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <div>
            <label
              htmlFor="craft-search"
              className="mb-1 block text-xs font-semibold tracking-[0.12em] text-pw-muted uppercase"
            >
              Item or building
            </label>
            <Combobox<CraftTarget>
              inputId="craft-search"
              label="Item or building"
              placeholder={
                target
                  ? `${target.name} (search to change)`
                  : 'Search for something to craft'
              }
              suggest={suggestTargets}
              onPick={choose}
              keyOf={(t) => `${t.kind}-${t.id}`}
              emptyHint="Type the name of an item or building"
              render={(t) => (
                <span className="flex items-center gap-3">
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
                </span>
              )}
            />
          </div>
          <div>
            <label
              htmlFor="craft-qty"
              className="mb-1 block text-xs font-semibold tracking-[0.12em] text-pw-muted uppercase"
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
              {tech && (
                <p className="text-sm text-white/70">
                  Unlocked by{' '}
                  <Link
                    to={`/technology?q=${encodeURIComponent(tech.name)}`}
                    className="font-semibold text-pw-sun hover:underline"
                  >
                    {tech.name}
                  </Link>{' '}
                  at level {tech.level}
                </p>
              )}
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
            role="group"
            aria-label="How to show the plan"
          >
            <Chip active={view === 'flow'} onClick={() => setView('flow')}>
              Flow
            </Chip>
            <Chip active={view === 'list'} onClick={() => setView('list')}>
              List
            </Chip>
            <span className="text-sm text-pw-muted">
              {view === 'flow'
                ? 'Raw materials, through each component, to the finished item. Hover or tap a box to trace it.'
                : 'Raw materials, then each step in order.'}
            </span>
          </div>

          {view === 'flow' ? (
            <Panel title="From raw materials to the finished item">
              <CraftFlow plan={plan} target={target} onChoose={chooseRecipe} />
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
                      onChoose={(v) => chooseRecipe(s.product, v)}
                    />
                  ))}
                </ol>
              </Panel>
            </>
          )}

          {plan.stations.length > 0 && <WorkbenchCards plan={plan} />}
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
              label: recipeSummary(v.recipe),
            }))}
            className="min-w-0"
            triggerClassName="h-8 text-sm"
          />
        </div>
      )}
    </li>
  );
}
