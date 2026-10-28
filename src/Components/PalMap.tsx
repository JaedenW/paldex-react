import React from 'react';
import { MAP_URL, mapBounds } from '../data';
import type { Boss, Spawns } from '../types';
import { boundsOf, formatCoords } from '../Utils/map';
import { cn } from '../Utils/cn';

const { left: LEFT, top: TOP, right: RIGHT, bottom: BOTTOM } = mapBounds;
const MAP_WIDTH = RIGHT - LEFT;
const MIN_SPAN = 60;

// the wiki's own colours for its habitat map
const DAY = '#FA9B02';
const NIGHT = '#7ED3F8';
const BOTH = '#b6f26b';

interface View {
  cx: number;
  cy: number;
  /** World units across the visible width */
  span: number;
}

export interface MapFocus {
  x: number;
  y: number;
  /** Changes whenever the same point should be focused again */
  key: number;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function fitView(points: [number, number][]): View {
  const b = boundsOf(points);
  if (!b)
    return { cx: (LEFT + RIGHT) / 2, cy: (TOP + BOTTOM) / 2, span: MAP_WIDTH };
  // leave a margin, and keep single points from zooming in absurdly far
  const span = clamp(
    Math.max(b.maxX - b.minX, (b.maxY - b.minY) * 1.3) * 1.25,
    400,
    MAP_WIDTH
  );
  return { cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, span };
}

export default function PalMap({
  spawns,
  bosses,
  focus,
}: {
  spawns?: Spawns;
  bosses: Boss[];
  focus?: MapFocus;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  const [imageFailed, setImageFailed] = React.useState(false);
  const [showDay, setShowDay] = React.useState(true);
  const [showNight, setShowNight] = React.useState(true);
  const [cursor, setCursor] = React.useState<[number, number] | null>(null);
  const [selected, setSelected] = React.useState<[number, number] | null>(null);

  const allPoints = React.useMemo<[number, number][]>(
    () => [
      ...(spawns?.day ?? []),
      ...(spawns?.night ?? []),
      ...bosses.map((b): [number, number] => [b.x, b.y]),
    ],
    [spawns, bosses]
  );
  const groups = React.useMemo(() => {
    const key = (p: [number, number]) => `${p[0]},${p[1]}`;
    const day = new Set((spawns?.day ?? []).map(key));
    const night = new Set((spawns?.night ?? []).map(key));
    return {
      both: (spawns?.day ?? []).filter((p) => night.has(key(p))),
      dayOnly: (spawns?.day ?? []).filter((p) => !night.has(key(p))),
      nightOnly: (spawns?.night ?? []).filter((p) => !day.has(key(p))),
    };
  }, [spawns]);
  const fit = React.useMemo(() => fitView(allPoints), [allPoints]);
  const [view, setView] = React.useState<View>(fit);
  React.useEffect(() => setView(fit), [fit]);

  React.useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = () => setImageFailed(true);
    img.src = MAP_URL;
  }, []);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight })
    );
    observer.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  // Pixels per world unit, and conversions both ways
  const scale = size.w / view.span;
  const toScreen = React.useCallback(
    (x: number, y: number): [number, number] => [
      (x - view.cx) * scale + size.w / 2,
      (view.cy - y) * scale + size.h / 2,
    ],
    [view, scale, size]
  );
  const toWorld = React.useCallback(
    (sx: number, sy: number): [number, number] => [
      view.cx + (sx - size.w / 2) / scale,
      view.cy - (sy - size.h / 2) / scale,
    ],
    [view, scale, size]
  );

  // Draw the map, the spawn points, then the boss pins and the selection
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#1b3a52';
    ctx.fillRect(0, 0, size.w, size.h);

    if (image) {
      const [x0, y0] = toScreen(LEFT, TOP);
      ctx.drawImage(image, x0, y0, MAP_WIDTH * scale, (TOP - BOTTOM) * scale);
    }

    const radius = clamp(scale * 6, 2, 9);
    const dots = (points: [number, number][], colour: string) => {
      if (!colour) return;
      ctx.fillStyle = colour;
      ctx.globalAlpha = 0.6;
      for (const [x, y] of points) {
        const [sx, sy] = toScreen(x, y);
        if (
          sx < -radius ||
          sy < -radius ||
          sx > size.w + radius ||
          sy > size.h + radius
        )
          continue;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    // most Pals spawn in the same spots by day and night, so those get a colour of their own
    dots(groups.dayOnly, showDay ? DAY : '');
    dots(groups.nightOnly, showNight ? NIGHT : '');
    dots(
      groups.both,
      showDay && showNight ? BOTH : showDay ? DAY : showNight ? NIGHT : ''
    );

    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const b of bosses) {
      const [sx, sy] = toScreen(b.x, b.y);
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 2);
      ctx.fillStyle = b.variant === 'Alpha' ? '#e5484d' : '#7c4ddb';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(b.variant[0], sx, sy + 0.5);
    }

    if (selected) {
      const [sx, sy] = toScreen(selected[0], selected[1]);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, 13, 0, Math.PI * 2);
      ctx.moveTo(sx - 22, sy);
      ctx.lineTo(sx - 8, sy);
      ctx.moveTo(sx + 8, sy);
      ctx.lineTo(sx + 22, sy);
      ctx.moveTo(sx, sy - 22);
      ctx.lineTo(sx, sy - 8);
      ctx.moveTo(sx, sy + 8);
      ctx.lineTo(sx, sy + 22);
      ctx.stroke();
      ctx.strokeStyle = '#0b1d2e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [
    image,
    size,
    view,
    scale,
    toScreen,
    spawns,
    bosses,
    showDay,
    showNight,
    selected,
  ]);

  const zoomAt = React.useCallback(
    (factor: number, sx = size.w / 2, sy = size.h / 2) => {
      setView((v) => {
        const s = size.w / v.span;
        const wx = v.cx + (sx - size.w / 2) / s;
        const wy = v.cy - (sy - size.h / 2) / s;
        const span = clamp(v.span * factor, MIN_SPAN, MAP_WIDTH * 1.1);
        const ns = size.w / span;
        return {
          span,
          cx: wx - (sx - size.w / 2) / ns,
          cy: wy + (sy - size.h / 2) / ns,
        };
      });
    },
    [size]
  );

  // The wheel needs a non-passive listener so the page doesn't scroll as well
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(
        Math.exp(e.deltaY * 0.002),
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // Drag to pan, pinch to zoom, tap to read off coordinates
  const pointers = React.useRef(new Map<number, [number, number]>());
  const moved = React.useRef(0);
  const local = (e: React.PointerEvent): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    moved.current = 0;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = local(e);
    setCursor(toWorld(pos[0], pos[1]));
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, pos);
    moved.current += Math.abs(pos[0] - prev[0]) + Math.abs(pos[1] - prev[1]);
    const others = [...pointers.current.entries()].filter(
      ([id]) => id !== e.pointerId
    );
    if (others.length === 1) {
      const o = others[0][1];
      const before = Math.hypot(prev[0] - o[0], prev[1] - o[1]);
      const after = Math.hypot(pos[0] - o[0], pos[1] - o[1]);
      if (before > 0 && after > 0)
        zoomAt(before / after, (pos[0] + o[0]) / 2, (pos[1] + o[1]) / 2);
    } else {
      setView((v) => ({
        ...v,
        cx: v.cx - (pos[0] - prev[0]) / scale,
        cy: v.cy + (pos[1] - prev[1]) / scale,
      }));
    }
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const wasTap = pointers.current.size === 1 && moved.current < 6;
    pointers.current.delete(e.pointerId);
    if (wasTap) {
      const pos = local(e);
      setSelected(toWorld(pos[0], pos[1]));
    }
  };

  // A hotspot or boss chosen from the list: centre on it and zoom in
  React.useEffect(() => {
    if (!focus) return;
    setSelected([focus.x, focus.y]);
    setView({ cx: focus.x, cy: focus.y, span: 500 });
    wrapRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focus]);

  const shown = selected ?? cursor;
  const button =
    'flex size-9 items-center justify-center rounded-lg bg-pw-deep/85 text-lg font-bold text-white shadow ring-1 ring-white/20 hover:bg-pw-deep';

  return (
    <div className="space-y-2">
      <div
        ref={wrapRef}
        className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#1b3a52] select-none sm:aspect-[4/3]"
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="World map showing where this Pal spawns. Use the coordinate list below for exact locations."
          className="absolute inset-0 size-full cursor-grab touch-none active:cursor-grabbing"
          style={{ width: size.w, height: size.h }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
          onPointerLeave={() => setCursor(null)}
        />
        {!image && !imageFailed && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Loading map…
          </div>
        )}
        {imageFailed && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">
            The map image is missing. Run npm run scrape:obtain to download it.
          </div>
        )}

        <div
          className="absolute top-2 left-2 rounded-lg bg-pw-deep/85 px-2.5 py-1 font-mono text-sm text-white ring-1 ring-white/20"
          aria-live="polite"
        >
          {shown ? (
            <>
              <span className="text-white/60">
                {selected ? 'Selected ' : ''}X, Y{' '}
              </span>
              {formatCoords(shown[0], shown[1])}
            </>
          ) : (
            <span className="text-white/60">Tap the map for coordinates</span>
          )}
        </div>

        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          <button
            type="button"
            aria-label="Zoom in"
            className={button}
            onClick={() => zoomAt(0.6)}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            className={button}
            onClick={() => zoomAt(1 / 0.6)}
          >
            −
          </button>
          <button
            type="button"
            aria-label="Fit to this Pal's locations"
            title="Fit to this Pal"
            className={cn(button, 'text-sm')}
            onClick={() => setView(fit)}
          >
            Fit
          </button>
          <button
            type="button"
            aria-label="Show the whole map"
            title="Whole map"
            className={cn(button, 'text-sm')}
            onClick={() =>
              setView({
                cx: (LEFT + RIGHT) / 2,
                cy: (TOP + BOTTOM) / 2,
                span: MAP_WIDTH,
              })
            }
          >
            All
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {spawns && spawns.day.length > 0 && (
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={showDay}
              onChange={(e) => setShowDay(e.target.checked)}
              className="size-4 accent-pw-sun"
            />
            <span
              aria-hidden="true"
              className="size-3 rounded-full"
              style={{ backgroundColor: DAY }}
            />
            Day spawns
          </label>
        )}
        {spawns && spawns.night.length > 0 && (
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={showNight}
              onChange={(e) => setShowNight(e.target.checked)}
              className="size-4 accent-sky-400"
            />
            <span
              aria-hidden="true"
              className="size-3 rounded-full"
              style={{ backgroundColor: NIGHT }}
            />
            Night spawns
          </label>
        )}
        {groups.both.length > 0 && showDay && showNight && (
          <span className="flex items-center gap-2 font-medium">
            <span
              aria-hidden="true"
              className="size-3 rounded-full"
              style={{ backgroundColor: BOTH }}
            />
            Day and night
          </span>
        )}
        {bosses.some((b) => b.variant === 'Alpha') && (
          <span className="flex items-center gap-2 font-medium">
            <span
              aria-hidden="true"
              className="flex size-4 items-center justify-center rounded-full bg-[#e5484d] text-[9px] font-bold text-white"
            >
              A
            </span>
            Alpha boss
          </span>
        )}
        {bosses.some((b) => b.variant === 'Predator') && (
          <span className="flex items-center gap-2 font-medium">
            <span
              aria-hidden="true"
              className="flex size-4 items-center justify-center rounded-full bg-[#7c4ddb] text-[9px] font-bold text-white"
            >
              P
            </span>
            Predator
          </span>
        )}
        <span className="text-pw-muted sm:ml-auto">
          Drag to pan, scroll or pinch to zoom
        </span>
      </div>
    </div>
  );
}
