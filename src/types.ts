export type Element =
  | 'Neutral'
  | 'Fire'
  | 'Water'
  | 'Grass'
  | 'Electric'
  | 'Ice'
  | 'Ground'
  | 'Dark'
  | 'Dragon';

export type WorkType =
  | 'Kindling'
  | 'Watering'
  | 'Planting'
  | 'Generating Electricity'
  | 'Handiwork'
  | 'Gathering'
  | 'Lumbering'
  | 'Mining'
  | 'Medicine Production'
  | 'Cooling'
  | 'Transporting'
  | 'Farming';

export interface PalStats {
  hp: number | null;
  attack: number | null;
  defense: number | null;
  workSpeed: number | null;
  stamina: number | null;
  slowWalk: number | null;
  walk: number | null;
  run: number | null;
  rideSprint: number | null;
  transport: number | null;
  swim: number | null;
  swimDash: number | null;
  expRatio: number | null;
  captureRate: number | null;
}

export interface Drop {
  item: string;
  chance: number | null;
  min: number | null;
  max: number | null;
}

export interface Pal {
  id: string;
  name: string;
  /** Paldeck number as printed by the wiki, e.g. "001" or "041B" */
  number: string;
  title?: string;
  description?: string;
  elements: Element[];
  size: string;
  work: Partial<Record<WorkType, number>>;
  hunger: number | null;
  nocturnal: boolean;
  sellPrice: number | null;
  stats: PalStats;
  alphaStats?: PalStats;
  partnerSkill?: { name: string; type: string; description: string };
  activeSkills: { name: string; level: number }[];
  passiveSkills: string[];
  breeding: {
    rank: number;
    maleProbability: number | null;
    egg: string;
    priority: number | null;
    unique: boolean;
  };
  drops: Drop[];
  alphaDrops: Drop[];
}

export interface ActiveSkill {
  id: string;
  name: string;
  description: string;
  element: Element;
  cooldown: number | null;
  power: number | null;
  fruit: boolean;
  boss: boolean;
  inheritable: boolean;
}

export interface PassiveSkill {
  id: string;
  name: string;
  rank: number | null;
  description: string;
}
