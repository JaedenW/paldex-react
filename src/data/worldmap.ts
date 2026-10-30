import type { MapDef, MapId, MapMarker } from '../Utils/worldmap';
import { obtain, palById } from './index';
import worldmap from './worldmap.json';

// The world map's data, shared by the home page and each Pal's map. It lives
// apart from data/index.ts so pages without a map don't load the markers.

const fromTable = worldmap.markers as MapMarker[];
const tableIds = new Set(fromTable.map((m) => m.id));

// Bosses a Pal's page places but the wiki's location table leaves out
const fromPages = Object.entries(obtain).flatMap(([pal, info]) =>
  (info.bosses ?? []).flatMap((b): MapMarker[] =>
    b.markerId &&
    !tableIds.has(b.markerId) &&
    b.x !== undefined &&
    b.y !== undefined
      ? [
          {
            id: b.markerId,
            layer: b.variant === 'Predator' ? 'predator' : 'alpha',
            map: b.map,
            name: palById.get(pal)?.name ?? pal,
            pal,
            region: b.location || undefined,
            level: b.level ?? undefined,
            x: b.x,
            y: b.y,
          },
        ]
      : []
  )
);

export const MAPS = worldmap.maps as Record<MapId, MapDef>;
export const MARKERS = [...fromTable, ...fromPages];
export const markerById = new Map(MARKERS.map((m) => [m.id, m]));
