import React from 'react';
import { rarityColours } from '../Utils/rarity';
import type { Rarity } from '../types';
import { cn } from '../Utils/cn';

/**
 * An item or building icon. Schematics share a placeholder and anything the
 * wiki has no picture of falls back to a coloured initial.
 */
export default function ItemIcon({
  kind = 'item',
  id,
  name,
  rarity,
  className,
}: {
  kind?: 'item' | 'building';
  id: string;
  name: string;
  rarity?: Rarity;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const [prev, setPrev] = React.useState(id);
  if (prev !== id) {
    setPrev(id);
    setFailed(false);
  }
  const colour = rarityColours[rarity ?? 'Common'];

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg font-display font-bold text-white',
          className
        )}
        style={{ backgroundColor: colour }}
      >
        {name[0]}
      </span>
    );
  }
  return (
    <img
      src={`/${kind === 'item' ? 'items' : 'buildings'}/${id}.webp`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('shrink-0 object-contain', className)}
    />
  );
}
