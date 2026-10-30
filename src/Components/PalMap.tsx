import React from 'react';
import { MapSwitch, TimeSwitch, ZoomButtons } from './MapControls';
import MarkerCard from './MarkerCard';
import { Chip } from './ui';
import WorldMap, { type SpawnSet, type WorldMapHandle } from './WorldMap';
import { MAPS, MARKERS, markerById } from '../data/worldmap';
import type { Obtain, Pal, Spawns } from '../types';
import { formatCoords } from '../Utils/map';
import {
  SPAWN_COLOURS,
  flySpan,
  layerById,
  type MapId,
  type MapMarker,
  type TimeOfDay,
} from '../Utils/worldmap';

/** The controls cover this much of the map; framing keeps clear of them */
const INSETS = { top: 8, right: 60, bottom: 28, left: 8 };

/** A place chosen from a list on the page, for the map to go to */
export interface MapFocus {
  map: MapId;
  x: number;
  y: number;
  markerId?: string;
  /** Changes whenever the same place should be focused again */
  key: number;
}

/**
 * A link to this Pal on the home page's map: at the marker if given, otherwise
 * showing its spawn points, or failing that at a place it is known to be.
 */
export function mainMapLink(pal: Pal, info: Obtain, marker?: MapMarker) {
  const place =
    marker ??
    (info.spawns
      ? undefined
      : (markerById.get(info.tree?.places[0] ?? '') ??
        MARKERS.find((m) => m.pal === pal.id)));
  const params = new URLSearchParams();
  if (place?.map === 'tree' || (!place && !info.spawns && info.tree))
    params.set('map', 'tree');
  if (place) params.set('m', place.id);
  if (info.spawns) params.set('pal', pal.id);
  return `/?${params}`;
}

/**
 * A Pal's corner of the world map: the same map, markers and controls as the
 * home page, with its spawn points, its bosses and, on the World Tree, the
 * regions it lives in picked out. Fast-travel statues stay on for finding your
 * way there.
 */
export default function PalMap({
  pal,
  info,
  spawns,
  focus,
}: {
  pal: Pal;
  info: Obtain;
  spawns?: Spawns;
  focus?: MapFocus;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<WorldMapHandle>(null);

  // its own Alpha and predator markers, and the regions it lives in
  const highlight = React.useMemo(
    () =>
      new Set([
        ...MARKERS.filter((m) => m.pal === pal.id).map((m) => m.id),
        ...(info.tree?.places ?? []),
      ]),
    [pal.id, info]
  );
  const own = React.useMemo(
    () => [...highlight].flatMap((id) => markerById.get(id) ?? []),
    [highlight]
  );
  const onWorld = !!info.spawns || own.some((m) => m.map === 'world');
  const onTree = !!info.tree || own.some((m) => m.map === 'tree');

  const [mapId, setMapId] = React.useState<MapId>(onWorld ? 'world' : 'tree');
  const [time, setTime] = React.useState<TimeOfDay>('both');
  const [statues, setStatues] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string>();
  const [pin, setPin] = React.useState<[number, number]>();
  const selected = selectedId ? markerById.get(selectedId) : undefined;
  const map = MAPS[mapId];

  const markers = React.useMemo(
    () =>
      MARKERS.filter(
        (m) =>
          m.map === mapId &&
          (highlight.has(m.id) ||
            m.id === selectedId ||
            (statues && m.layer === 'statue'))
      ),
    [mapId, highlight, selectedId, statues]
  );
  const spawnSets = React.useMemo<SpawnSet[]>(
    () =>
      spawns && mapId === 'world'
        ? [{ id: pal.id, colour: SPAWN_COLOURS[0], ...spawns }]
        : [],
    [spawns, mapId, pal.id]
  );

  const changeMap = (id: MapId) => {
    setMapId(id);
    setSelectedId(undefined);
    setPin(undefined);
  };

  // frame everything of this Pal's on the Palpagos map; the World Tree is small
  // enough that it opens showing all of it
  React.useEffect(() => {
    if (mapId !== 'world') return;
    const points = own
      .filter((m) => m.map === 'world')
      .map((m): [number, number] => [m.x, m.y]);
    if (spawns) points.push(...spawns.day, ...spawns.night);
    if (points.length) mapRef.current?.fit(points);
  }, [mapId, own, spawns]);

  // a place chosen from a list: go to its map, then to the place
  const handled = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (!focus || focus.key === handled.current) return;
    if (focus.map !== mapId) {
      setMapId(focus.map);
      return;
    }
    handled.current = focus.key;
    setSelectedId(focus.markerId);
    setPin(focus.markerId ? undefined : [focus.x, focus.y]);
    mapRef.current?.flyTo(focus.x, focus.y, flySpan(MAPS[focus.map]));
    wrapRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focus, mapId]);

  const layers = [
    ...new Set(own.filter((m) => m.map === mapId).map((m) => m.layer)),
  ];

  return (
    <div className="space-y-2">
      {onWorld && onTree && <MapSwitch value={mapId} onChange={changeMap} />}
      <div
        ref={wrapRef}
        className="relative aspect-square w-full scroll-mt-32 overflow-hidden rounded-xl sm:aspect-[4/3]"
      >
        <WorldMap
          ref={mapRef}
          map={map}
          markers={markers}
          spawns={spawnSets}
          time={time}
          selectedId={selectedId}
          highlightIds={highlight}
          labelZoom={6}
          pin={pin}
          insets={INSETS}
          onSelect={(m) => setSelectedId(m?.id)}
          onTap={(x, y) => setPin([x, y])}
        />
        <ZoomButtons mapRef={mapRef} />
      </div>

      {map.approximate && (
        <p className="rounded-xl bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-400/15 dark:text-amber-100">
          World Tree positions are estimated. The wiki gives coordinates but not
          how they line up with the picture, so a marker can be a little off.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {mapId === 'world' && spawns && (
          <>
            <TimeSwitch value={time} onChange={setTime} />
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-3 rounded-full"
                style={{ backgroundColor: SPAWN_COLOURS[0] }}
              />
              Spawn points
            </span>
          </>
        )}
        {layers.map((id) => {
          const layer = layerById.get(id);
          return (
            layer && (
              <span key={id} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: layer.colour }}
                >
                  {layer.glyph}
                </span>
                {id === 'statue' ? 'Regions it lives in' : layer.label}
              </span>
            )
          );
        })}
        <Chip
          active={statues}
          onClick={() => setStatues(!statues)}
          className="ml-auto h-8"
        >
          Fast travel statues
        </Chip>
      </div>

      {pin && (
        <p className="text-sm text-pw-muted">
          Picked point:{' '}
          <code className="rounded bg-pw-cream px-1.5 py-0.5 font-mono font-semibold text-pw-ink">
            {formatCoords(pin[0], pin[1])}
          </code>
        </p>
      )}

      {selected && (
        <MarkerCard
          marker={selected}
          mainMapHref={mainMapLink(pal, info, selected)}
          onClose={() => setSelectedId(undefined)}
        />
      )}
    </div>
  );
}
