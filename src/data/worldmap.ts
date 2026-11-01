import type { MapDef, MapId, MapMarker } from '../Utils/worldmap';
import worldmap from './worldmap.json';

// The world map's data, shared by the home page and each Pal's map. It lives
// apart from data/index.ts so pages without a map don't load the markers.

export const MAPS = worldmap.maps as Record<MapId, MapDef>;
export const MARKERS = worldmap.markers as MapMarker[];
export const markerById = new Map(MARKERS.map((m) => [m.id, m]));
