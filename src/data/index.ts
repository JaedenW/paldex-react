import type { ActiveSkill, PassiveSkill, Pal } from '../types';
import palsJson from './pals.json';
import skillsJson from './skills.json';
import passivesJson from './passives.json';
import combosJson from './combos.json';
import itemsJson from './items.json';
import meta from './meta.json';

export const pals = palsJson as unknown as Pal[];
export const activeSkills = skillsJson as unknown as ActiveSkill[];
export const passiveSkills = passivesJson as unknown as PassiveSkill[];
/** [parent, parent, child] Pal ids that breed into a specific child */
export const uniqueCombos = combosJson as [string, string, string][];
export const items = itemsJson as Record<
  string,
  { type: string; rarity: string }
>;
export const dataSource = meta as { source: string; scrapedAt: string };

export const palById = new Map(pals.map((p) => [p.id, p]));
export const skillByName = new Map(activeSkills.map((s) => [s.name, s]));
export const skillById = new Map(activeSkills.map((s) => [s.id, s]));
export const passiveByName = new Map(passiveSkills.map((s) => [s.name, s]));
export const passiveById = new Map(passiveSkills.map((s) => [s.id, s]));

/** Pal art lives in public/pals; variants without art of their own have none. */
export const palIcon = (p: Pal) => `/pals/${p.id}.png`;
export const palArt = (p: Pal) => `/pals/${p.id}-art.webp`;
