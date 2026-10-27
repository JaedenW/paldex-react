import React from 'react';
import type { Pal } from '../types';
import { palArt, palIcon } from '../data';
import { elementColours } from '../Utils/elements';
import { cn } from '../Utils/cn';

/**
 * Pal art, with a coloured initial standing in for Pals the wiki has no image
 * of (mostly the Noct, Cryst and other variants).
 */
export default function PalImage({
  pal,
  variant = 'icon',
  className,
}: {
  pal: Pal;
  variant?: 'icon' | 'art';
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const [prevSrc, setPrevSrc] = React.useState(pal.id);
  if (prevSrc !== pal.id) {
    setPrevSrc(pal.id);
    setFailed(false);
  }

  if (failed && variant === 'art') {
    return <PalImage pal={pal} className={className} />;
  }
  if (failed) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          'flex items-center justify-center rounded-full font-display text-2xl font-bold text-white',
          className
        )}
        style={{
          backgroundColor: elementColours[pal.elements[0]] ?? '#8c8a82',
        }}
      >
        {pal.name[0]}
      </div>
    );
  }
  return (
    <img
      src={variant === 'art' ? palArt(pal) : palIcon(pal)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-contain', className)}
    />
  );
}
