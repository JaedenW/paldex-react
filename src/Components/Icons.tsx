import type { SVGProps } from 'react';

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
  function Icon(props: P) {
    return (
      <svg {...base} className="size-5" {...props}>
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
