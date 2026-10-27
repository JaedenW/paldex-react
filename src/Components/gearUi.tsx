import { Link } from 'react-router';
import ItemIcon from './ItemIcon';
import { buildingByName, itemByName } from '../data/gear';
import { rarityColours } from '../Utils/rarity';
import { formatNumber } from '../Utils/text';
import type { Rarity, Recipe } from '../types';
import { cn } from '../Utils/cn';

export function RarityBadge({
  rarity,
  className,
}: {
  rarity?: Rarity;
  className?: string;
}) {
  if (!rarity) return null;
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold text-white',
        className
      )}
      style={{ backgroundColor: rarityColours[rarity] }}
    >
      {rarity}
    </span>
  );
}

/** An item by name, with its icon and a link when the wiki lists it */
export function ItemLink({
  name,
  qty,
  className,
}: {
  name: string;
  qty?: number;
  className?: string;
}) {
  const item = itemByName.get(name);
  const body = (
    <>
      {item && item.type !== 'Schematic' && (
        <ItemIcon
          id={item.id}
          name={name}
          rarity={item.rarity}
          className="size-8"
        />
      )}
      <span className="font-semibold">{name}</span>
      {qty !== undefined && (
        <span className="font-display text-lg font-bold text-pw-teal-dark">
          ×{formatNumber(qty)}
        </span>
      )}
    </>
  );
  const classes = cn('inline-flex items-center gap-2', className);
  return item ? (
    <Link to={`/item/${item.id}`} className={cn(classes, 'hover:underline')}>
      {body}
    </Link>
  ) : (
    <span className={classes}>{body}</span>
  );
}

/** A workbench or machine, linked when it is a building */
export function StationLink({ name }: { name: string }) {
  const building = buildingByName.get(name);
  return building ? (
    <Link
      to={`/building/${building.id}`}
      className="font-semibold text-pw-teal-dark hover:underline"
    >
      {name}
    </Link>
  ) : (
    <span className="font-semibold">{name}</span>
  );
}

export function RecipeCard({
  recipe,
  stations = recipe.station ? [recipe.station] : [],
}: {
  recipe: Recipe;
  /** Every bench that makes it this way; defaults to the recipe's own */
  stations?: string[];
}) {
  return (
    <div className="rounded-xl bg-pw-cream/70 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {stations.length > 0 ? (
          <span>
            <span className="text-pw-muted">At </span>
            {stations.map((name, i) => (
              <span key={name}>
                {i > 0 && <span className="text-pw-muted"> or </span>}
                <StationLink name={name} />
              </span>
            ))}
          </span>
        ) : recipe.kind === 'building' ? (
          <span className="font-semibold">Build menu</span>
        ) : (
          <span className="text-pw-muted">Station not listed</span>
        )}
        {recipe.qty > 1 && (
          <span className="text-pw-muted">Makes {recipe.qty}</span>
        )}
        {recipe.workload !== undefined && (
          <span className="text-pw-muted">
            Workload {formatNumber(recipe.workload)}
          </span>
        )}
        <RarityBadge rarity={recipe.quality} />
        {recipe.schematic && (
          <span className="text-pw-muted">
            Needs <ItemLink name={recipe.schematic} className="text-pw-ink" />
          </span>
        )}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {recipe.ingredients.map((i) => (
          <li key={i.name}>
            <ItemLink name={i.name} qty={i.qty} />
          </li>
        ))}
      </ul>
    </div>
  );
}
