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
        isActive: startsWith('/paldex', '/pal'),
      },
      {
        id: 'breeding',
        label: 'Breeding',
        to: '/breeding',
        icon: EggIcon,
        isActive: startsWith('/breeding'),
      },
      {
        id: 'elements',
        label: 'Elements',
        to: '/elements',
        icon: BoltIcon,
        isActive: startsWith('/elements'),
      },
      {
        id: 'work',
        label: 'Work',
        to: '/work',
        icon: HammerIcon,
        isActive: startsWith('/work'),
      },
      {
        id: 'skills',
        label: 'Skills',
        to: '/skills',
        icon: SwordIcon,
        isActive: startsWith('/skills', '/skill'),
      },
      {
        id: 'passives',
        label: 'Passives',
        to: '/passives',
        icon: SparkIcon,
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
        isActive: startsWith('/items', '/item'),
      },
      {
        id: 'crafting',
        label: 'Crafting',
        to: '/crafting',
        icon: WrenchIcon,
        isActive: startsWith('/crafting'),
      },
      {
        id: 'buildings',
        label: 'Buildings',
        to: '/buildings',
        icon: HomeIcon,
        isActive: startsWith('/buildings', '/building'),
      },
      {
        id: 'technology',
        label: 'Technology',
        to: '/technology',
        icon: FlaskIcon,
        isActive: startsWith('/technology'),
      },
    ],
  },
];
