import React from 'react';
import { Link } from 'react-router';
import PalImage from './PalImage';
import { CloseIcon, CopyIcon, LinkIcon } from './Icons';
import { markerTitle } from './MapSearch';
import { palById } from '../data';
import { layerById, type MapMarker } from '../Utils/worldmap';
import { cn } from '../Utils/cn';

const small =
  'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ring-1 ring-pw-line transition hover:ring-pw-teal';

/** Details for the selected marker, with ways to use them */
export default function MarkerCard({
  marker,
  canShowSpawns,
  onShowSpawns,
  onClose,
}: {
  marker: MapMarker;
  /** The marker is a Pal with spawn points that are not on the map yet */
  canShowSpawns: boolean;
  onShowSpawns: () => void;
  onClose: () => void;
}) {
  const [note, setNote] = React.useState('');
  const def = layerById.get(marker.layer);
  const pal = marker.pal ? palById.get(marker.pal) : undefined;
  const coords = `${marker.x}, ${marker.y}`;

  const copy = async (text: string, said: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNote(said);
    } catch {
      setNote('Copying isn’t available here');
    }
    window.setTimeout(() => setNote(''), 1800);
  };

  const coordsBadge = (
    <code className="rounded bg-pw-cream px-1.5 py-0.5 font-mono text-sm">
      {coords}
    </code>
  );
  const facts = (
    [
      ['Level', marker.level ? `Lv. ${marker.level}` : undefined],
      ['Boss', marker.boss],
      ['Hard mode', marker.hardLevel ? `Lv. ${marker.hardLevel}` : undefined],
      ['Area', marker.region],
      ['Coordinates', coordsBadge],
      ['Note', marker.note],
    ] as [string, React.ReactNode][]
  ).filter(([, v]) => v !== undefined && v !== '');

  return (
    <section
      aria-label={`${markerTitle(marker)} details`}
      className="pointer-events-auto relative card p-3.5 shadow-lift"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close details"
        className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full text-pw-muted transition hover:bg-pw-cream"
      >
        <CloseIcon className="size-4" />
      </button>
      <div className="flex items-center gap-3 pr-8">
        {pal ? (
          <PalImage
            pal={pal}
            className="size-12 shrink-0 rounded-xl bg-pw-cream"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: def?.colour }}
          >
            {def?.glyph}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight break-words">
            {markerTitle(marker)}
          </h2>
          <p className="text-xs font-semibold tracking-wide text-pw-muted uppercase">
            {def?.label}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {facts.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="text-pw-muted">{k}</dt>
            <dd className="min-w-0 font-medium">{v}</dd>
          </React.Fragment>
        ))}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {pal && (
          <Link
            to={`/pal/${pal.id}`}
            className={cn(
              small,
              'bg-pw-navy text-white ring-0 hover:bg-pw-deep'
            )}
          >
            {pal.name}’s page
          </Link>
        )}
        {canShowSpawns && (
          <button
            type="button"
            onClick={onShowSpawns}
            className={cn(small, 'bg-pw-sun text-pw-deep ring-0')}
          >
            Show spawns
          </button>
        )}
        <button
          type="button"
          onClick={() => copy(coords, 'Coordinates copied')}
          className={cn(small, 'bg-pw-field')}
        >
          <CopyIcon className="size-4" /> Copy coords
        </button>
        <button
          type="button"
          onClick={() => copy(window.location.href, 'Link copied')}
          className={cn(small, 'bg-pw-field')}
        >
          <LinkIcon className="size-4" /> Copy link
        </button>
      </div>
      <p
        role="status"
        className="mt-1.5 min-h-4 text-xs font-semibold text-pw-link"
      >
        {note}
      </p>
    </section>
  );
}
