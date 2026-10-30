import Combobox from './Combobox';
import PalImage from './PalImage';
import { obtain, palById, pals } from '../data';
import { matchScore } from '../Utils/search';
import { layerById, type MapMarker } from '../Utils/worldmap';
import { MARKERS } from '../data/worldmap';
import type { Pal } from '../types';

export const markerTitle = (m: MapMarker) =>
  m.layer === 'alpha'
    ? `Alpha ${m.name}`
    : m.layer === 'predator'
      ? `Predator ${m.name}`
      : m.name;

export type MapResult =
  | { kind: 'pal'; pal: Pal; spawns: number }
  | { kind: 'place'; marker: MapMarker };

/** Pals first (they show where they spawn), then named places on either map */
export function searchMap(query: string): MapResult[] {
  const q = query.trim();
  if (!q) return [];
  const palHits = pals
    .map((pal) => ({
      pal,
      score: matchScore(pal.name, q),
      spawns: obtain[pal.id]?.spawns ?? 0,
    }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.spawns > 0) - Number(a.spawns > 0) ||
        a.pal.name.localeCompare(b.pal.name)
    )
    .slice(0, 5)
    .map((x): MapResult => ({ kind: 'pal', pal: x.pal, spawns: x.spawns }));
  const placeHits = MARKERS.map((marker) => ({
    marker,
    score: Math.max(
      matchScore(marker.name, q),
      matchScore(marker.region ?? '', q) * 0.5,
      matchScore(marker.boss ?? '', q) * 0.7
    ),
  }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.marker.name.localeCompare(b.marker.name)
    )
    .slice(0, 6)
    .map((x): MapResult => ({ kind: 'place', marker: x.marker }));
  return [...palHits, ...placeHits];
}

/** One search box for Pals (to show their spawns) and places (to fly to them) */
export default function MapSearch({
  onPickPal,
  onPickPlace,
}: {
  onPickPal: (pal: Pal) => void;
  onPickPlace: (marker: MapMarker) => void;
}) {
  return (
    <Combobox<MapResult>
      label="Search the map"
      placeholder="Search Pals and places…"
      suggest={searchMap}
      onPick={(r) =>
        r.kind === 'pal' ? onPickPal(r.pal) : onPickPlace(r.marker)
      }
      keyOf={(r) =>
        r.kind === 'pal' ? `pal-${r.pal.id}` : `place-${r.marker.id}`
      }
      emptyHint="Type a Pal or a place name"
      render={(r) => {
        if (r.kind === 'pal') {
          return (
            <span className="flex items-center gap-2.5">
              <PalImage pal={r.pal} className="size-8 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {r.pal.name}
                </span>
                <span className="block text-xs text-pw-muted">
                  {r.spawns > 0
                    ? 'Show where it spawns'
                    : obtain[r.pal.id]?.tree
                      ? 'Lives on the World Tree'
                      : 'No spawn points on the wiki'}
                </span>
              </span>
              <span className="rounded-full bg-pw-navy/10 px-2 py-0.5 text-xs font-semibold text-pw-heading">
                Pal
              </span>
            </span>
          );
        }
        const m = r.marker;
        const def = layerById.get(m.layer);
        const pal = m.pal ? palById.get(m.pal) : undefined;
        return (
          <span className="flex items-center gap-2.5">
            {pal ? (
              <PalImage pal={pal} className="size-8 shrink-0" />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: def?.colour }}
              >
                {def?.glyph}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {markerTitle(m)}
              </span>
              <span className="block truncate text-xs text-pw-muted">
                {[
                  def?.label,
                  m.region,
                  m.map === 'tree' ? 'World Tree' : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
          </span>
        );
      }}
    />
  );
}
