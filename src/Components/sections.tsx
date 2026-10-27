import type { ComponentType, SVGProps } from 'react';
import {
  BoltIcon,
  BoxIcon,
  EggIcon,
  FlaskIcon,
  HammerIcon,
  HomeIcon,
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

/** The sections that get a place in the top bar and the bottom tabs */
export const SECTIONS: Section[] = [
  {
    id: 'paldex',
    label: 'Paldex',
    to: '/paldex',
    icon: PawIcon,
    isActive: startsWith('/paldex', '/pal'),
  },
  {
    id: 'items',
    label: 'Items',
    to: '/items',
    icon: BoxIcon,
    isActive: startsWith('/items', '/item'),
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
    label: 'Tech',
    to: '/technology',
    icon: FlaskIcon,
    isActive: startsWith('/technology'),
  },
  {
    id: 'crafting',
    label: 'Crafting',
    to: '/crafting',
    icon: WrenchIcon,
    isActive: startsWith('/crafting'),
  },
];

/** Everything else lives in the More menu */
export const MORE_SECTIONS: Section[] = [
  {
    id: 'elements',
    label: 'Elements',
    to: '/elements',
    icon: BoltIcon,
    isActive: startsWith('/elements'),
  },
  {
    id: 'work',
    label: 'Work suitability',
    to: '/work',
    icon: HammerIcon,
    isActive: startsWith('/work'),
  },
  {
    id: 'skills',
    label: 'Active skills',
    to: '/skills',
    icon: SwordIcon,
    isActive: startsWith('/skills', '/skill'),
  },
  {
    id: 'passives',
    label: 'Passive skills',
    to: '/passives',
    icon: SparkIcon,
    isActive: startsWith('/passives'),
  },
  {
    id: 'breeding',
    label: 'Breeding calculator',
    to: '/breeding',
    icon: EggIcon,
    isActive: startsWith('/breeding'),
  },
];
