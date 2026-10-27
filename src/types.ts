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

export interface Boss {
  /** Alpha, Predator, … */
  variant: string;
  location: string;
  level: number | null;
  x: number;
  y: number;
  note?: string;
}

/** How to find a Pal, scraped from its wiki page and the wiki's habitat map */
export interface Obtain {
  prose?: string[];
  regions?: string[];
  bosses?: Boss[];
  dungeons?: { name: string; note?: string }[];
  raid?: string;
  /** Number of wild spawn points; the points themselves load from public/habitats */
  spawns?: number;
}

/** Wild spawn points as [x, y] game coordinates */
export interface Spawns {
  day: [number, number][];
  night: [number, number][];
}

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface GearStats {
  quality?: Rarity;
  sell?: number;
  durability?: number;
  attack?: number;
  defense?: number;
  health?: number;
  shield?: number;
  glider?: number;
  stamina?: number;
  capture?: number;
  effect?: string;
  ammo?: string;
}

export interface Item {
  id: string;
  name: string;
  type: string;
  subtype?: string;
  description?: string;
  rarity?: Rarity;
  sell?: number;
  weight?: number;
  /** Name of the technology that unlocks it */
  tech?: string;
  food?: {
    nutrition?: number;
    sanity?: number;
    corruption?: number;
    effect?: string;
  };
  /** One row of stats per quality */
  gear?: GearStats[];
}

export interface Building {
  id: string;
  name: string;
  type?: string;
  subtype?: string;
  description?: string;
  hp?: number;
  capacity?: number;
  support?: boolean;
  tech?: string;
}

export interface Recipe {
  /** Name of the item or building this makes */
  product: string;
  kind: 'item' | 'building';
  qty: number;
  /** Workbench or machine; absent for buildings */
  station?: string;
  workload?: number;
  /** Absent for Common */
  quality?: Rarity;
  ingredients: { name: string; qty: number }[];
  /** Schematic item needed for this quality */
  schematic?: string;
}

export interface Tech {
  id: string;
  name: string;
  /** Player level needed */
  level: number;
  /** Technology points, or ancient technology points when ancient */
  cost: number;
  ancient?: boolean;
  requires?: string;
  unlocks?: { kind: 'item' | 'building'; name: string }[];
}

export interface ItemSources {
  /** Other ways to get it, from the wiki's item page: nodes, ranches, mining sites… */
  other?: string[];
  shops?: {
    merchant: string;
    cost?: number;
    currency?: string;
    min?: number;
    max?: number;
  }[];
  found?: {
    category: string;
    label: string;
    chance?: number;
    min?: number;
    max?: number;
  }[];
  dropped?: {
    target: string;
    type: string;
    variant?: string;
    chance?: number;
    min?: number;
    max?: number;
  }[];
}

/** What the wiki's Breeding page says about who can be bred how */
export interface BreedingRules {
  /** Pals the wiki's rank table marks as eligible (true) or not; newer Pals are missing */
  pool: Record<string, boolean>;
  /** Pals that only come from two parents of their own species */
  sameOnly: string[];
  /** Fixed pairings: [parent, parent, child] */
  special: [string, string, string][];
  /** Pairings that depend on the mother: [mother, father, child] */
  byGender: [string, string, string][];
}
