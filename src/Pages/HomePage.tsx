import React from 'react';
import { Link, useSearchParams } from 'react-router';
import MapSearch, { markerTitle } from '../Components/MapSearch';
import MarkerCard from '../Components/MarkerCard';
import { MapSwitch, TimeSwitch, ZoomButtons } from '../Components/MapControls';
import WorldMap, {
  type SpawnSet,
  type WorldMapHandle,
} from '../Components/WorldMap';
import { CloseIcon, LayersIcon } from '../Components/Icons';
import { obtain, palById } from '../data';
import { MAPS, MARKERS as ALL, markerById } from '../data/worldmap';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { useMediaQuery } from '../Hooks/useMediaQuery';
import { useQueryPatch } from '../Hooks/useQueryState';
import { useSpawnsOf } from '../Hooks/useSpawns';
import {
  LAYERS,
  MAX_SPAWN_PALS,
  SPAWN_COLOURS,
  flySpan,
  formatAt,
  formatLayers,
  parseAt,
  parseLayers,
  type LayerId,
  type MapId,
  type MapMarker,
  type TimeOfDay,
  type View,
} from '../Utils/worldmap';
import type { Pal } from '../types';
import { cn } from '../Utils/cn';

// how many markers each layer has on each map, for the panel
const COUNTS: Record<MapId, Partial<Record<LayerId, number>>> = {
  world: {},
  tree: {},
};
for (const m of ALL) COUNTS[m.map][m.layer] = (COUNTS[m.map][m.layer] ?? 0) + 1;

/**
 * The home page: the world map. Everything about the view (which map, layers,
 * Pals shown, selection, and where you are) is in the address, so a link shares
 * exactly what you are looking at.
 */
export default function HomePage() {
  useDocumentTitle();
  const [params] = useSearchParams();
  const patch = useQueryPatch();
  const mapRef = React.useRef<WorldMapHandle>(null);

  const mapId: MapId = params.get('map') === 'tree' ? 'tree' : 'world';
  const map = MAPS[mapId];
  const layerParam = params.get('layers');
  const layers = React.useMemo(() => parseLayers(layerParam), [layerParam]);
  const palParam = params.get('pal') ?? '';
  const palIds = React.useMemo(
    () =>
      palParam
        .split(',')
        .filter((id) => palById.has(id))
        .slice(0, MAX_SPAWN_PALS),
    [palParam]
  );
  const tod: TimeOfDay =
    params.get('tod') === 'day'
      ? 'day'
      : params.get('tod') === 'night'
        ? 'night'
        : 'both';
  const selected = ALL.find((m) => m.id === params.get('m') && m.map === mapId);
  // a shared view applies the first time only; after that the map owns it
  const [initialView] = React.useState<View | undefined>(() =>
    parseAt(params.get('at'))
  );

  const isWide = useMediaQuery('(min-width: 64rem)');
  const [panelOpen, setPanelOpen] = React.useState(isWide);
  const [notice, setNotice] = React.useState('');
  const flyToSelection = React.useRef(!!selected && !initialView);
  const pendingFit = React.useRef<string | undefined>(undefined);
  const fitSharedPals = React.useRef(
    palIds.length > 0 && !initialView && !selected
  );

  const spawnData = useSpawnsOf(palIds);
  const spawnSets: SpawnSet[] = palIds.flatMap((id, i) => {
    const s = spawnData[id];
    return s
      ? [
          {
            id,
            colour: SPAWN_COLOURS[i % SPAWN_COLOURS.length],
            day: s.day,
            night: s.night,
          },
        ]
      : [];
  });
  const loading = palIds.some((id) => !(id in spawnData));

  const markers = React.useMemo(() => {
    const list = ALL.filter((m) => m.map === mapId && layers.has(m.layer));
    // the selected marker stays visible even if its layer is switched off
    return selected && !list.includes(selected) ? [...list, selected] : list;
  }, [mapId, layers, selected]);

  const say = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice((n) => (n === text ? '' : n)), 4500);
  };

  // fly to a place chosen in search or a shared link, once the right map is showing
  React.useEffect(() => {
    if (selected && flyToSelection.current) {
      mapRef.current?.flyTo(selected.x, selected.y, flySpan(map));
      // cleared a moment later, so strict mode's repeated effect run still flies
      const t = window.setTimeout(() => (flyToSelection.current = false), 150);
      return () => window.clearTimeout(t);
    }
  }, [selected, map]);

  // a link with Pals but no saved view: frame all their spawns once they have loaded
  React.useEffect(() => {
    if (!fitSharedPals.current || palIds.length === 0) return;
    const all = palIds.map((id) => spawnData[id]);
    if (all.some((x) => x === undefined)) return;
    fitSharedPals.current = false;
    const points = all.flatMap((x) => (x ? [...x.day, ...x.night] : []));
    if (points.length) mapRef.current?.fit(points);
  }, [palIds, spawnData]);

  // frame a Pal's spawns once it has been added and they have arrived
  React.useEffect(() => {
    const id = pendingFit.current;
    const s = id ? spawnData[id] : undefined;
    if (id && s) {
      pendingFit.current = undefined;
      mapRef.current?.fit([...s.day, ...s.night]);
    }
  }, [palIds, spawnData]);

  const setMap = (id: MapId) =>
    patch({
      map: id === 'tree' ? 'tree' : undefined,
      at: undefined,
      m: undefined,
    });

  const toggleLayer = (id: LayerId) => {
    const next = new Set(layers);
    if (!next.delete(id)) next.add(id);
    patch({ layers: formatLayers(next) });
  };

  const addPal = (pal: Pal) => {
    if (palIds.includes(pal.id)) {
      const s = spawnData[pal.id];
      if (s) mapRef.current?.fit([...s.day, ...s.night]);
      return;
    }
    if (!obtain[pal.id]?.spawns) {
      const place = markerById.get(obtain[pal.id]?.tree?.places[0] ?? '');
      if (place) {
        say(`${pal.name} lives in ${place.name} on the World Tree.`);
        pickPlace(place);
        return;
      }
      const alpha = ALL.find((m) => m.pal === pal.id && m.layer === 'alpha');
      say(
        `The wiki has no spawn points for ${pal.name}.${alpha ? ' Its Alpha boss is selected instead.' : ''}`
      );
      if (alpha) pickPlace(alpha);
      return;
    }
    if (palIds.length >= MAX_SPAWN_PALS) {
      say(`Up to ${MAX_SPAWN_PALS} Pals at once. Remove one first.`);
      return;
    }
    pendingFit.current = pal.id;
    patch({
      pal: [...palIds, pal.id].join(','),
      ...(mapId === 'tree'
        ? { map: undefined, at: undefined, m: undefined }
        : {}),
    });
  };

  const removePal = (id: string) =>
    patch({ pal: palIds.filter((p) => p !== id).join(',') || undefined });

  function pickPlace(marker: MapMarker) {
    flyToSelection.current = true;
    patch({
      map: marker.map === 'tree' ? 'tree' : undefined,
      m: marker.id,
      ...(marker.map !== mapId ? { at: undefined } : {}),
    });
  }

  const onSelect = (marker: MapMarker | undefined) => {
    if (marker?.id !== selected?.id) patch({ m: marker?.id });
  };

  const selectedPal = selected?.pal ? palById.get(selected.pal) : undefined;
  // the controls cover part of the map; keep framing and flying clear of them
  const hasCard = !!selected;
  const insets = React.useMemo(
    () =>
      isWide
        ? { top: 16, right: 72, bottom: 36, left: 372 }
        : { top: 148, right: 64, bottom: hasCard ? 330 : 40, left: 8 },
    [isWide, hasCard]
  );

  return (
    <div className="relative h-[calc(100dvh-var(--header-h))] overflow-hidden lg:h-dvh">
      <WorldMap
        ref={mapRef}
        map={map}
        markers={markers}
        spawns={spawnSets}
        time={tod}
        selectedId={selected?.id}
        initialView={initialView}
        insets={insets}
        onSelect={onSelect}
        onViewChange={(v) => patch({ at: formatAt(v) })}
      />

      {/* search, map switch and layers */}
      <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex max-h-[calc(100%-1rem)] flex-col gap-2 lg:inset-x-auto lg:top-3 lg:left-3 lg:w-[21rem]">
        <div className="pointer-events-auto flex gap-2">
          <div className="min-w-0 flex-1">
            <MapSearch onPickPal={addPal} onPickPlace={pickPlace} />
          </div>
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls="map-layers"
            onClick={() => setPanelOpen((o) => !o)}
            className={cn(
              'flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lift ring-1 transition',
              panelOpen
                ? 'bg-pw-navy text-white ring-pw-navy'
                : 'bg-pw-paper text-pw-ink ring-pw-line hover:ring-pw-teal'
            )}
          >
            <LayersIcon className="size-5" />
            <span className="hidden sm:inline">Layers</span>
          </button>
        </div>

        <MapSwitch
          value={mapId}
          onChange={setMap}
          className="pointer-events-auto"
        />

        {palIds.length > 0 && (
          <section
            aria-label="Pals on the map"
            className="pointer-events-auto card p-2.5 shadow-lift"
          >
            <ul className="flex flex-wrap gap-1.5">
              {palIds.map((id, i) => {
                const pal = palById.get(id)!;
                const set = spawnData[id];
                return (
                  <li
                    key={id}
                    className="flex items-center gap-1.5 rounded-full bg-pw-cream py-0.5 pr-0.5 pl-2.5 text-sm font-semibold ring-1 ring-pw-line"
                  >
                    <span
                      aria-hidden="true"
                      className="size-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          SPAWN_COLOURS[i % SPAWN_COLOURS.length],
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set && mapRef.current?.fit([...set.day, ...set.night])
                      }
                      title="Zoom to its spawns"
                      className="hover:underline"
                    >
                      {pal.name}
                    </button>
                    <Link
                      to={`/pal/${id}`}
                      className="text-xs font-normal text-pw-link hover:underline"
                    >
                      page
                    </Link>
                    <button
                      type="button"
                      aria-label={`Remove ${pal.name}`}
                      onClick={() => removePal(id)}
                      className="flex size-7 items-center justify-center rounded-full hover:bg-black/10"
                    >
                      <CloseIcon className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <TimeSwitch
              value={tod}
              onChange={(t) => patch({ tod: t === 'both' ? undefined : t })}
              className="mt-2"
            />
            {loading && (
              <p className="mt-1.5 text-xs text-pw-muted">
                Loading spawn points…
              </p>
            )}
            {mapId === 'tree' && (
              <p className="mt-1.5 text-xs text-pw-muted">
                Spawns are on the Palpagos Islands map; the wiki has none for
                the World Tree yet.
              </p>
            )}
          </section>
        )}

        {map.approximate && (
          <p className="pointer-events-auto rounded-full bg-amber-100 px-3 py-1.5 text-center text-xs font-semibold text-amber-900 shadow-lift dark:bg-amber-400/20 dark:text-amber-100">
            Marker positions on the World Tree are estimated
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="pointer-events-auto rounded-xl bg-pw-deep/95 px-3 py-2 text-sm text-white shadow-lift ring-1 ring-white/15"
          >
            {notice}
          </p>
        )}

        {panelOpen && (
          <section
            id="map-layers"
            aria-label="Map layers"
            className="pointer-events-auto flex min-h-0 flex-col gap-4 overflow-y-auto card p-3.5 shadow-lift"
          >
            <div>
              <h2 className="mb-1.5 text-xs font-semibold tracking-[0.12em] text-pw-muted uppercase">
                Show on the map
              </h2>
              <ul className="space-y-0.5">
                {LAYERS.map((l) => {
                  const count = COUNTS[mapId][l.id] ?? 0;
                  return (
                    <li key={l.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-pw-cream',
                          count === 0 &&
                            'cursor-not-allowed opacity-45 hover:bg-transparent'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={layers.has(l.id) && count > 0}
                          disabled={count === 0}
                          onChange={() => toggleLayer(l.id)}
                          className="size-4 shrink-0"
                          style={{ accentColor: l.colour }}
                        />
                        <span
                          aria-hidden="true"
                          className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ring-1 ring-white/60"
                          style={{ backgroundColor: l.colour }}
                        >
                          {l.glyph}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {l.label}
                          </span>
                          <span className="hidden truncate text-xs text-pw-muted sm:block">
                            {l.description}
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-pw-muted">
                          {count}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="text-xs text-pw-muted">
              Search for a Pal above to see where it spawns, day and night. You
              can show up to {MAX_SPAWN_PALS} at once.
            </p>

            {map.approximate && (
              <p className="rounded-xl bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-400/15 dark:text-amber-100">
                World Tree positions are estimated. The wiki gives coordinates
                but not how they line up with the picture, so a marker can be a
                little off.
              </p>
            )}
          </section>
        )}
      </div>

      <ZoomButtons
        mapRef={mapRef}
        className={cn('lg:right-3', panelOpen && 'max-lg:hidden')}
      />

      {/* the selected marker */}
      {selected && (
        <div className="pointer-events-none absolute inset-x-2 bottom-8 z-20 lg:inset-x-auto lg:right-3 lg:w-96">
          <MarkerCard
            marker={selected}
            canShowSpawns={
              !!selectedPal &&
              (obtain[selectedPal.id]?.spawns ?? 0) > 0 &&
              !palIds.includes(selectedPal.id)
            }
            onShowSpawns={() => selectedPal && addPal(selectedPal)}
            onClose={() => onSelect(undefined)}
          />
        </div>
      )}

      <p className="pointer-events-none absolute right-2 bottom-1.5 z-10 rounded bg-pw-deep/80 px-1.5 py-0.5 text-[11px] text-white/80">
        <a
          href="https://palworld.wiki.gg"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto underline decoration-white/40 underline-offset-2 hover:decoration-white"
        >
          Palworld Wiki
        </a>{' '}
        · CC BY-SA 4.0 ·{' '}
        {selected ? markerTitle(selected) : 'unofficial fan project'}
      </p>
    </div>
  );
}
