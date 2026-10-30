import type { RefObject } from 'react';
import { FitIcon, MinusIcon, PlusIcon } from './Icons';
import type { WorldMapHandle } from './WorldMap';
import { MAPS } from '../data/worldmap';
import type { MapId, TimeOfDay } from '../Utils/worldmap';
import { cn } from '../Utils/cn';

// The controls every map shares, so the home page and a Pal's map work alike

const MAP_IDS: MapId[] = ['world', 'tree'];

/** Palpagos Islands or the World Tree */
export function MapSwitch({
  value,
  onChange,
  className,
}: {
  value: MapId;
  onChange: (id: MapId) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Map"
      className={cn(
        'flex rounded-full bg-pw-paper p-1 shadow-lift ring-1 ring-pw-line',
        className
      )}
    >
      {MAP_IDS.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => value !== id && onChange(id)}
          className={cn(
            'h-9 flex-1 rounded-full px-3 text-sm font-semibold transition',
            value === id
              ? 'bg-pw-sun text-pw-deep'
              : 'text-pw-ink hover:bg-pw-cream'
          )}
        >
          {MAPS[id].name}
        </button>
      ))}
    </div>
  );
}

const TIMES: { id: TimeOfDay; label: string }[] = [
  { id: 'both', label: 'Day & night' },
  { id: 'day', label: 'Day' },
  { id: 'night', label: 'Night' },
];

/** Which spawn points to show */
export function TimeSwitch({
  value,
  onChange,
  className,
}: {
  value: TimeOfDay;
  onChange: (time: TimeOfDay) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Time of day"
      className={cn(
        'flex rounded-full bg-pw-cream p-0.5 ring-1 ring-pw-line',
        className
      )}
    >
      {TIMES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'h-8 flex-1 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition',
            value === id ? 'bg-pw-navy text-white' : 'hover:bg-pw-field'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const roundButton =
  'pointer-events-auto flex size-11 items-center justify-center rounded-full bg-pw-paper text-pw-ink shadow-lift ring-1 ring-pw-line transition hover:ring-pw-teal active:translate-y-px';

/** Zoom in, zoom out and show the whole map, on the map's right edge */
export function ZoomButtons({
  mapRef,
  className,
}: {
  mapRef: RefObject<WorldMapHandle | null>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-1/2 right-2 z-20 flex -translate-y-1/2 flex-col gap-1.5',
        className
      )}
    >
      <button
        type="button"
        aria-label="Zoom in"
        className={roundButton}
        onClick={() => mapRef.current?.zoomBy(0.6)}
      >
        <PlusIcon />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        className={roundButton}
        onClick={() => mapRef.current?.zoomBy(1 / 0.6)}
      >
        <MinusIcon />
      </button>
      <button
        type="button"
        aria-label="Show the whole map"
        title="Show the whole map"
        className={roundButton}
        onClick={() => mapRef.current?.reset()}
      >
        <FitIcon />
      </button>
    </div>
  );
}
