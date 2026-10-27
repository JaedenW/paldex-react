import type { SVGProps } from 'react';
import { cn } from '../Utils/cn';

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

type P = SVGProps<SVGSVGElement>;
const icon = (d: React.ReactNode) =>
  function Icon({ className, ...props }: P) {
    // default to 20px, but let callers resize or recolour without losing it
    return (
      <svg
        {...base}
        {...props}
        className={cn(
          'shrink-0',
          !/\bsize-/.test(className ?? '') && 'size-5',
          className
        )}
      >
        {d}
      </svg>
    );
  };

export const SearchIcon = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>
);
export const CloseIcon = icon(<path d="M18 6 6 18M6 6l12 12" />);
export const PawIcon = icon(
  <>
    <circle cx="6" cy="10" r="1.8" />
    <circle cx="10" cy="6" r="1.8" />
    <circle cx="14" cy="6" r="1.8" />
    <circle cx="18" cy="10" r="1.8" />
    <path d="M12 11c-3 0-5 3-5 5.2 0 1.6 1.2 2.3 2.6 2.3 1 0 1.5-.4 2.4-.4s1.4.4 2.4.4c1.4 0 2.6-.7 2.6-2.3C17 14 15 11 12 11Z" />
  </>
);
export const FlameIcon = icon(
  <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9Z" />
);
export const HammerIcon = icon(
  <>
    <path d="m14 7 3 3-9 9a2.1 2.1 0 0 1-3-3Z" />
    <path d="m13 4 4-1 4 4-1 4-3-3Z" />
  </>
);
export const BoltIcon = icon(<path d="M13 2 4 14h7l-1 8 9-12h-7Z" />);
export const HeartIcon = icon(
  <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11Z" />
);
export const EggIcon = icon(
  <path d="M12 3c3.5 0 6 6 6 10a6 6 0 0 1-12 0c0-4 2.5-10 6-10Z" />
);
export const GridIcon = icon(
  <>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </>
);
export const ListIcon = icon(
  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
);
export const ArrowLeftIcon = icon(<path d="m12 19-7-7 7-7M5 12h14" />);
export const ChevronIcon = icon(<path d="m9 6 6 6-6 6" />);
export const MoonIcon = icon(
  <path d="M21 13a8 8 0 1 1-10-10 6.5 6.5 0 0 0 10 10Z" />
);
export const SwordIcon = icon(
  <path d="m14.5 17.5 6-6V3h-8.5l-6 6M3 21l5-5M5 14l5 5" />
);
export const SparkIcon = icon(
  <path d="M12 3v4m0 10v4M3 12h4m10 0h4m-3.5-6.5-2.8 2.8M9.3 14.7l-2.8 2.8m0-11 2.8 2.8m5.4 5.4 2.8 2.8" />
);

export const BoxIcon = icon(
  <>
    <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
    <path d="m3 8 9 5 9-5M12 13v8" />
  </>
);
export const HomeIcon = icon(
  <>
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10h14V10M10 20v-6h4v6" />
  </>
);
export const FlaskIcon = icon(
  <>
    <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
    <path d="M7.5 15h9" />
  </>
);
export const WrenchIcon = icon(
  <path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7V21h3.3l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4Z" />
);
export const MoreIcon = icon(
  <>
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />
  </>
);

export const MenuIcon = icon(<path d="M4 6h16M4 12h16M4 18h16" />);
export const LayoutIcon = icon(
  <>
    <rect x="3" y="3" width="8" height="10" rx="1.5" />
    <rect x="13" y="3" width="8" height="6" rx="1.5" />
    <rect x="13" y="11" width="8" height="10" rx="1.5" />
    <rect x="3" y="15" width="8" height="6" rx="1.5" />
  </>
);
export const ArrowRightIcon = icon(<path d="M5 12h14m-6-6 6 6-6 6" />);

export const CheckIcon = icon(<path d="m5 12 5 5L20 7" />);

export const SunIcon = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
  </>
);
export const MonitorIcon = icon(
  <>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </>
);

export const LockIcon = icon(
  <>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>
);
