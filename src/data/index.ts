import type {
  ActiveSkill,
  BreedingRules,
  Obtain,
  PassiveSkill,
  Pal,
} from '../types';
import { createBreeder } from '../Utils/breeding';
import palsJson from './pals.json';
import skillsJson from './skills.json';
import passivesJson from './passives.json';
import combosJson from './combos.json';
import meta from './meta.json';
import obtainJson from './obtain.json';
import mapJson from './map.json';
import dropItemsJson from './dropItems.json';
import breedingJson from './breeding.json';

export const pals = palsJson as unknown as Pal[];
export const activeSkills = skillsJson as unknown as ActiveSkill[];
export const passiveSkills = passivesJson as unknown as PassiveSkill[];
/** [parent, parent, child] Pal ids that breed into a specific child */
export const uniqueCombos = combosJson as [string, string, string][];
export const dataSource = meta as {
  source: string;
  scrapedAt: string;
  /** The newest Palworld version the wiki documents, such as "1.0.5" */
  gameVersion?: string;
  gameVersionDate?: string;
};

export const palById = new Map(pals.map((p) => [p.id, p]));
export const skillByName = new Map(activeSkills.map((s) => [s.name, s]));
export const skillById = new Map(activeSkills.map((s) => [s.id, s]));
export const passiveByName = new Map(passiveSkills.map((s) => [s.name, s]));
export const passiveById = new Map(passiveSkills.map((s) => [s.id, s]));

/** Pal art lives in public/pals; variants without art of their own have none. */
export const palIcon = (p: Pal) => `/pals/${p.id}.png`;
export const palArt = (p: Pal) => `/pals/${p.id}-art.webp`;

export const obtain = obtainJson as unknown as Record<string, Obtain>;
export const mapBounds = mapJson as {
  topLeft: [number, number];
  bottomRight: [number, number];
};
export const MAP_URL = '/map/world.webp';

/** Names of Pal drops that have an item page */
export const linkableDrops = new Set(dropItemsJson as string[]);

export const breedingRules = breedingJson as unknown as BreedingRules;
/** Species lookup for two parents, built once from the Pal data and wiki rules */
export const breeder = createBreeder(pals, uniqueCombos, breedingRules);

import gearCountsJson from './gearCounts.json';
/** Totals for items, buildings, recipes and technologies, without loading them */
export const gearCounts = gearCountsJson as {
  items: number;
  buildings: number;
  recipes: number;
  tech: number;
};
