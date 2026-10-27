import React from 'react';
import { Link } from 'react-router';
import ItemIcon from './ItemIcon';
import { StationLink } from './gearUi';
import { Select } from './ui';
import { buildingByName, itemByName } from '../data/gear';
import {
  flowLayout,
  type CraftPlan,
  type FlowEdge,
  type FlowNode,
} from '../Utils/crafting';
import { formatNumber } from '../Utils/text';
import { cn } from '../Utils/cn';

interface Target {
  kind: 'item' | 'building';
  id: string;
  name: string;
}

/** An item's or building's icon by name, with a letter when there isn't one */
function NodeIcon({
  name,
  asBuilding,
  className,
}: {
  name: string;
  asBuilding?: boolean;
  className: string;
}) {
  const building = asBuilding ? buildingByName.get(name) : undefined;
  const item = itemByName.get(name);
  if (building)
    return (
      <ItemIcon
        kind="building"
        id={building.id}
        name={name}
        className={className}
      />
    );
  if (item && item.type !== 'Schematic')
    return (
      <ItemIcon
        id={item.id}
        name={name}
        rarity={item.rarity}
        className={className}
      />
    );
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center rounded-lg bg-pw-cream font-display font-bold text-pw-muted',
        className
      )}
    >
      {name[0]}
    </span>
  );
}

const pageOf = (name: string, asBuilding?: boolean) => {
  const b = asBuilding ? buildingByName.get(name) : undefined;
  if (b) return `/building/${b.id}`;
  const i = itemByName.get(name);
  return i ? `/item/${i.id}` : undefined;
};

function Name({
  name,
  asBuilding,
  className,
}: {
  name: string;
  asBuilding?: boolean;
  className?: string;
}) {
  const to = pageOf(name, asBuilding);
  return to ? (
    <Link to={to} className={cn('hover:underline', className)}>
      {name}
    </Link>
  ) : (
    <span className={className}>{name}</span>
  );
}

const qtyText = (n: number) => `×${formatNumber(n)}`;

/** The ingredients a crafted node uses, as small chips */
function Inputs({ node, edges }: { node: FlowNode; edges: FlowEdge[] }) {
  const mine = edges.filter((e) => e.to === node.id);
  return (
    <ul
      className="mt-2 flex flex-wrap gap-1"
      aria-label={`Ingredients for ${node.id}`}
    >
      {mine.map((e) => (
        <li
          key={e.from}
          className="flex items-center gap-1 rounded-full bg-pw-cream/80 py-0.5 pr-2 pl-0.5 text-xs font-medium text-pw-ink ring-1 ring-pw-line"
        >
          <NodeIcon name={e.from} className="size-5 shrink-0" />
          <span className="font-display text-sm font-bold text-pw-link">
            {qtyText(e.qty)}
          </span>
          <span className="max-w-32 truncate">{e.from}</span>
        </li>
      ))}
    </ul>
  );
}

function StageHeader({
  index,
  last,
  count,
}: {
  index: number;
  last: boolean;
  count: number;
}) {
  const label = index === 0 ? 'Gather' : last ? 'Result' : 'Craft';
  const sub =
    index === 0
      ? `${count} raw material${count === 1 ? '' : 's'}`
      : last
        ? 'finished item'
        : `step ${index}`;
  return (
    <div className="mb-2 flex items-center gap-2">
      <span aria-hidden="true" className="size-2 rotate-45 bg-pw-sun" />
      <h3 className="font-display text-lg leading-none">{label}</h3>
      <span className="text-xs text-pw-muted">{sub}</span>
    </div>
  );
}

/**
 * The plan as a flow: raw materials on the left, components in the order they
 * are made, the item on the right, with curves showing what feeds what. Hover or
 * focus a node to trace what goes into it and what it goes into. On phones the
 * stages stack from top to bottom and the curves are left out, since each crafted
 * node already lists its ingredients.
 */
export default function CraftFlow({
  plan,
  target,
  onChoose,
}: {
  plan: CraftPlan;
  target: Target;
  onChoose: (product: string, variant: number) => void;
}) {
  const layout = React.useMemo(() => flowLayout(plan), [plan]);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const nodeEls = React.useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = React.useState<
    {
      key: string;
      d: string;
      from: string;
      to: string;
      end: [number, number];
    }[]
  >([]);
  const [focus, setFocus] = React.useState<string>();

  // everything upstream and downstream of the focused node, to highlight its trail
  const related = React.useMemo(() => {
    if (!focus) return undefined;
    const set = new Set([focus]);
    const up = (id: string) => {
      for (const e of layout.edges)
        if (e.to === id && !set.has(e.from)) (set.add(e.from), up(e.from));
    };
    const down = (id: string) => {
      for (const e of layout.edges)
        if (e.from === id && !set.has(e.to)) (set.add(e.to), down(e.to));
    };
    up(focus);
    down(focus);
    return set;
  }, [focus, layout]);

  const measure = React.useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const box = inner.getBoundingClientRect();
    const next: typeof paths = [];
    for (const e of layout.edges) {
      const a = nodeEls.current.get(e.from)?.getBoundingClientRect();
      const b = nodeEls.current.get(e.to)?.getBoundingClientRect();
      if (!a || !b) continue;
      const x1 = a.right - box.left;
      const y1 = a.top + a.height / 2 - box.top;
      const x2 = b.left - box.left;
      const y2 = b.top + b.height / 2 - box.top;
      const dx = Math.max(24, (x2 - x1) / 2);
      next.push({
        key: `${e.from}>${e.to}`,
        d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`,
        from: e.from,
        to: e.to,
        end: [x2, y2],
      });
    }
    setPaths(next);
  }, [layout]);

  React.useLayoutEffect(() => {
    measure();
    const inner = innerRef.current;
    if (!inner || typeof ResizeObserver === 'undefined') return;
    // redraw when anything changes size: the window, a node growing as a recipe is chosen, images loading
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    nodeEls.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [measure]);

  const register = (id: string) => (el: HTMLElement | null) => {
    if (el) nodeEls.current.set(id, el);
    else nodeEls.current.delete(id);
  };

  const lastColumn = layout.columns.length - 1;

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div
        ref={innerRef}
        className="relative flex flex-col gap-1 lg:min-w-max lg:flex-row lg:gap-12 lg:p-1"
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 hidden size-full overflow-visible lg:block"
        >
          {paths.map((p) => {
            const on = !related || (related.has(p.from) && related.has(p.to));
            return (
              <g
                key={p.key}
                className={cn(
                  'transition-opacity',
                  related && !on && 'opacity-10'
                )}
              >
                <path
                  d={p.d}
                  fill="none"
                  strokeWidth={on && related ? 2.5 : 1.75}
                  className={cn(
                    on && related ? 'stroke-pw-sun' : 'stroke-pw-teal/50'
                  )}
                />
                <circle
                  cx={p.end[0]}
                  cy={p.end[1]}
                  r={3.5}
                  className={on && related ? 'fill-pw-sun' : 'fill-pw-teal/60'}
                />
              </g>
            );
          })}
        </svg>

        {layout.columns.map((col, i) => (
          <React.Fragment key={i}>
            <section
              className="relative z-10 lg:w-56 lg:shrink-0"
              aria-label={
                i === 0
                  ? 'Raw materials'
                  : i === lastColumn
                    ? 'Finished item'
                    : `Crafting step ${i}`
              }
            >
              <StageHeader
                index={i}
                last={i === lastColumn}
                count={col.length}
              />
              <ol className="flex flex-col gap-2">
                {col.map((node) => {
                  const dim = related && !related.has(node.id);
                  const isTarget = i === lastColumn && node.id === target.name;
                  const common = {
                    ref: register(node.id),
                    tabIndex: 0,
                    onMouseEnter: () => setFocus(node.id),
                    onMouseLeave: () => setFocus(undefined),
                    onFocus: () => setFocus(node.id),
                    onBlur: () => setFocus(undefined),
                  };
                  const step = node.step;
                  return (
                    <li key={node.id}>
                      {node.kind === 'raw' ? (
                        <div
                          {...common}
                          className={cn(
                            'flex items-center gap-2.5 rounded-xl border bg-pw-paper p-2 pr-3 shadow-card transition-opacity',
                            dim && 'opacity-40'
                          )}
                        >
                          <NodeIcon
                            name={node.id}
                            className="size-10 shrink-0"
                          />
                          <span className="min-w-0 flex-1">
                            <Name
                              name={node.id}
                              className="block truncate font-semibold"
                            />
                            <span className="text-xs text-pw-muted">
                              gather or buy
                            </span>
                          </span>
                          <span className="font-display text-2xl leading-none font-bold">
                            {formatNumber(node.qty)}
                          </span>
                        </div>
                      ) : isTarget ? (
                        <div
                          {...common}
                          className={cn(
                            'rounded-xl bg-pw-navy p-3 text-white shadow-lift ring-2 ring-pw-sun transition-opacity',
                            dim && 'opacity-40'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <NodeIcon
                              name={node.id}
                              asBuilding={target.kind === 'building'}
                              className="size-12 shrink-0 rounded-lg bg-white/10"
                            />
                            <span className="min-w-0 flex-1">
                              <Name
                                name={node.id}
                                asBuilding={target.kind === 'building'}
                                className="block font-display text-xl leading-tight font-bold"
                              />
                              <span className="text-xs text-white/70">
                                {step && step.stations.length > 0 ? (
                                  <>
                                    craft {step.batches}× at{' '}
                                    {step.stations.map((s, k) => (
                                      <React.Fragment key={s}>
                                        {k > 0 && ' or '}
                                        <span className="font-semibold text-pw-sun">
                                          {s}
                                        </span>
                                      </React.Fragment>
                                    ))}
                                  </>
                                ) : (
                                  step && `craft ${step.batches}×`
                                )}
                                {step &&
                                  step.recipe.qty > 1 &&
                                  ` · makes ${step.made}`}
                              </span>
                            </span>
                            <span className="font-display text-3xl leading-none font-bold text-pw-sun">
                              {formatNumber(node.qty)}
                            </span>
                          </div>
                          {step && <Inputs node={node} edges={layout.edges} />}
                        </div>
                      ) : (
                        <div
                          {...common}
                          className={cn(
                            'rounded-xl border border-l-4 border-l-pw-sun bg-pw-paper p-2.5 shadow-card transition-opacity',
                            dim && 'opacity-40'
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <NodeIcon
                              name={node.id}
                              className="size-10 shrink-0"
                            />
                            <span className="min-w-0 flex-1">
                              <Name
                                name={node.id}
                                className="block truncate font-semibold"
                              />
                              <span className="text-xs text-pw-muted">
                                craft {step?.batches}×
                                {step &&
                                  step.recipe.qty > 1 &&
                                  ` · makes ${step.made}, need ${step.needed}`}
                              </span>
                            </span>
                            <span className="font-display text-2xl leading-none font-bold">
                              {formatNumber(node.qty)}
                            </span>
                          </div>
                          {step && step.stations.length > 0 && (
                            <p className="mt-1.5 text-xs text-pw-muted">
                              at{' '}
                              {step.stations.map((s, k) => (
                                <React.Fragment key={s}>
                                  {k > 0 && ' or '}
                                  <StationLink name={s} />
                                </React.Fragment>
                              ))}
                            </p>
                          )}
                          {step && <Inputs node={node} edges={layout.edges} />}
                          {step && step.variants.length > 1 && (
                            <Select
                              label={`Recipe for ${node.id}`}
                              value={String(step.variantIndex)}
                              onChange={(v) => onChoose(node.id, Number(v))}
                              options={step.variants.map((v, k) => ({
                                value: String(k),
                                label: v.recipe.ingredients
                                  .map((x) => `${x.qty} ${x.name}`)
                                  .join(', '),
                              }))}
                              className="mt-2"
                              triggerClassName="h-8 w-full text-xs"
                            />
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
            {i < lastColumn && (
              <div
                aria-hidden="true"
                className="flex justify-center py-1 text-pw-sun lg:hidden"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14m-6-6 6 6 6-6" />
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
