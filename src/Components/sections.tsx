import type { ComponentType, SVGProps } from 'react';
import {
  BoltIcon,
  EggIcon,
  HammerIcon,
  PawIcon,
  SparkIcon,
  SwordIcon,
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

export const SECTIONS: Section[] = [
  {
    id: 'paldex',
    label: 'Paldex',
    to: '/paldex',
    icon: PawIcon,
    isActive: startsWith('/paldex', '/pal'),
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
  {
    id: 'breeding',
    label: 'Breeding',
    to: '/breeding',
    icon: EggIcon,
    isActive: startsWith('/breeding'),
  },
];
