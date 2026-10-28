import type { ComponentType, SVGProps } from 'react';
import {
  BoltIcon,
  BoxIcon,
  EggIcon,
  FlaskIcon,
  HammerIcon,
  HomeIcon,
  MapIcon,
  PawIcon,
  SparkIcon,
  SwordIcon,
  WrenchIcon,
} from './Icons';

export interface Section {
  id: string;
  label: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** One line on what's there; shown on the home page and the menu */
  description: string;
  /** Accent colour for this section's tile */
  accent: string;
  isActive: (pathname: string) => boolean;
}

const startsWith =
  (...prefixes: string[]) =>
  (p: string) =>
    prefixes.some((x) => p === x || p.startsWith(`${x}/`));

export const HOME: Section = {
  id: 'home',
  label: 'Map',
  to: '/',
  icon: MapIcon,
  description: 'The world map: spawns, bosses, towers and fast travel',
  accent: '#1fb5a8',
  isActive: (p) => p === '/',
};

export interface SectionGroup {
  id: string;
  label: string;
  sections: Section[];
}

/** Navigation, grouped so every section is visible and easy to place */
export const GROUPS: SectionGroup[] = [
  {
    id: 'pals',
    label: 'Pals',
    sections: [
      {
        id: 'paldex',
        label: 'Paldex',
        to: '/paldex',
        icon: PawIcon,
        description: 'Every Pal with stats, work, skills, drops and spawn maps',
        accent: '#1fb5a8',
        isActive: startsWith('/paldex', '/pal'),
      },
      {
        id: 'breeding',
        label: 'Breeding',
        to: '/breeding',
        icon: EggIcon,
        description: 'Offspring, trait odds, and which parents make a Pal',
        accent: '#d6568f',
        isActive: startsWith('/breeding'),
      },
      {
        id: 'elements',
        label: 'Elements',
        to: '/elements',
        icon: BoltIcon,
        description: 'Type chart and a defence calculator',
        accent: '#3b82d6',
        isActive: startsWith('/elements'),
      },
      {
        id: 'work',
        label: 'Work',
        to: '/work',
        icon: HammerIcon,
        description: 'Which Pals are best at each base job',
        accent: '#5fa12a',
        isActive: startsWith('/work'),
      },
      {
        id: 'skills',
        label: 'Skills',
        to: '/skills',
        icon: SwordIcon,
        description: 'Active skills: power, cooldown and who learns them',
        accent: '#e5484d',
        isActive: startsWith('/skills', '/skill'),
      },
      {
        id: 'passives',
        label: 'Passives',
        to: '/passives',
        icon: SparkIcon,
        description: 'Passive skill ranks and effects',
        accent: '#7c4ddb',
        isActive: startsWith('/passives'),
      },
    ],
  },
  {
    id: 'gear',
    label: 'Items & Base',
    sections: [
      {
        id: 'items',
        label: 'Items',
        to: '/items',
        icon: BoxIcon,
        description:
          'Weapons, armor, materials and food, and where they come from',
        accent: '#e08a0b',
        isActive: startsWith('/items', '/item'),
      },
      {
        id: 'crafting',
        label: 'Crafting',
        to: '/crafting',
        icon: WrenchIcon,
        description: 'Calculate the materials and benches for anything',
        accent: '#e8602c',
        isActive: startsWith('/crafting'),
      },
      {
        id: 'buildings',
        label: 'Buildings',
        to: '/buildings',
        icon: HomeIcon,
        description: 'Every structure, its cost and what it crafts',
        accent: '#2f7fd1',
        isActive: startsWith('/buildings', '/building'),
      },
      {
        id: 'technology',
        label: 'Technology',
        to: '/technology',
        icon: FlaskIcon,
        description: 'The tech tree by level, with point costs',
        accent: '#8b4fd3',
        isActive: startsWith('/technology'),
      },
    ],
  },
];

export const ALL_SECTIONS: Section[] = GROUPS.flatMap((g) => g.sections);
