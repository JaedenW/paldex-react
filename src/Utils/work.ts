import { compareNumbers } from './text';
import type { Pal, WorkType } from '../types';

export const WORK_TYPES: WorkType[] = [
  'Kindling',
  'Watering',
  'Planting',
  'Generating Electricity',
  'Handiwork',
  'Gathering',
  'Lumbering',
  'Mining',
  'Medicine Production',
  'Cooling',
  'Transporting',
  'Farming',
];

export const workDescriptions: Record<WorkType, string> = {
  Kindling: 'Lights fires for cooking and smelting',
  Watering: 'Waters crops',
  Planting: 'Sows seeds and tends plantations',
  'Generating Electricity': 'Powers generators',
  Handiwork: 'Crafts items and builds',
  Gathering: 'Picks berries and other resources',
  Lumbering: 'Fells trees',
  Mining: 'Breaks ore and stone',
  'Medicine Production': 'Makes medicine',
  Cooling: 'Chills things at base',
  Transporting: 'Carries items around the base',
  Farming: 'Collects ranch products',
};

export const workId = (w: WorkType) => w.toLowerCase().replace(/\s+/g, '-');
export const workFromId = (id: string | undefined) =>
  WORK_TYPES.find((w) => workId(w) === id);

/** Pals with this work type, best first */
export function palsByWork(pals: Pal[], work: WorkType) {
  return pals
    .filter((p) => p.work[work])
    .sort(
      (a, b) =>
        (b.work[work] ?? 0) - (a.work[work] ?? 0) ||
        compareNumbers(a.number, b.number)
    );
}
