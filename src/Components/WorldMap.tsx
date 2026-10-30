import React from 'react';
import { palIcon } from '../data';
import { cn } from '../Utils/cn';
import { formatCoords } from '../Utils/map';
import {
  clamp,
  clampView,
  fitPoints,
  fitSpan,
  fitView,
  layerById,
  nearestMarker,
  pxPerUnit,
  toScreen,
  toWorld,
  zoomAround,
  type Bounds,
  type MapMarker,
  type Size,
  type View,
} from '../Utils/worldmap';

export interface MapDef {
  id: string;
  name: string;
  bounds: Bounds;
  /** The part to frame when showing the whole map, when the picture has empty margins */
  focus?: Bounds;
  /** A small picture that loads first */
  image: string;
  /** The full-resolution picture, loaded once someone zooms in */
  full: string;
  approximate?: boolean;
}

export interface SpawnSet {
  id: string;
  colour: string;
  day: [number, number][];
  night: [number, number][];
}

export interface WorldMapHandle {
  flyTo(x: number, y: number, span?: number): void;
  fit(points?: [number, number][]): void;
  zoomBy(factor: number): void;
  reset(): void;
}

// the pictures' own edge colour, so the map has no visible border
const BACKGROUND = '#0d151c';

// Pal pictures for Alpha and predator markers, shared by every map
const icons = new Map<string, HTMLImageElement | undefined>();
function icon(id: string, onLoad: () => void) {
  if (icons.has(id)) return icons.get(id); // undefined until it has loaded
  icons.set(id, undefined);
  const img = new Image();
  img.onload = () => {
    icons.set(id, img);
    onLoad();
  };
  img.src = palIcon({ id });
  return undefined;
}

const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/**
 * The map: a picture with markers and spawn dots drawn over it on a canvas.
 * Drag to pan, wheel or pinch to zoom, tap a marker to select it. The view lives
 * in a ref and is redrawn directly, so panning never re-renders React.
 */
const WorldMap = React.forwardRef<
  WorldMapHandle,
  {
    map: MapDef;
    markers: MapMarker[];
    spawns: SpawnSet[];
    time: 'both' | 'day' | 'night';
    selectedId?: string;
    /** The view to open with, such as one from a shared link */
    initialView?: View;
    /** Pixels at each edge covered by controls: framing and flying to a place keep it clear of them */
    insets?: { top: number; right: number; bottom: number; left: number };
    onSelect: (marker: MapMarker | undefined) => void;
    /** Called a moment after the view stops changing */
    onViewChange?: (view: View) => void;
    className?: string;
  }
>(function WorldMap(
  {
    map,
    markers,
    spawns,
    time,
    selectedId,
    initialView,
    insets,
    onSelect,
    onViewChange,
    className,
  },
  ref
) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const coordsRef = React.useRef<HTMLSpanElement>(null);
  const sizeRef = React.useRef<Size>({ w: 0, h: 0 });
  const viewRef = React.useRef<View>({ cx: 0, cy: 0, span: 1 });
  const rafRef = React.useRef(0);
  const flyRef = React.useRef(0);
  const notifyTimer = React.useRef<number | undefined>(undefined);
  const lowRef = React.useRef<HTMLImageElement | undefined>(undefined);
  const fullRef = React.useRef<HTMLImageElement | undefined>(undefined);
  const fullRequested = React.useRef(false);
  const [ready, setReady] = React.useState(false);
  const [size, setSize] = React.useState<Size>({ w: 0, h: 0 });
  const [hover, setHover] = React.useState<{
    marker: MapMarker;
    x: number;
    y: number;
  }>();

  // everything the draw loop reads, kept in a ref so it never goes stale
  const latest = {
    map,
    markers,
    spawns,
    time,
    selectedId,
    insets,
    onViewChange,
  };
  const live = React.useRef(latest);
  live.current = latest;

  const width = map.bounds.right - map.bounds.left;
  const minSpan = width / 45;

  /**
   * A view that frames the given ground inside the free area (the box minus the
   * insets): `span` is how many units fit across the free area, and the centre
   * lands in the middle of it rather than in the middle of the screen.
   */
  const framed = React.useCallback(
    (cx: number, cy: number, freeSpan: number): View => {
      const s = sizeRef.current;
      const i = live.current.insets ?? { top: 0, right: 0, bottom: 0, left: 0 };
      const freeW = Math.max(120, s.w - i.left - i.right);
      const span = (freeSpan * s.w) / freeW;
      const k = s.w / span;
      const icx = i.left + freeW / 2;
      const icy = i.top + Math.max(120, s.h - i.top - i.bottom) / 2;
      return {
        span,
        cx: cx - (icx - s.w / 2) / k,
        cy: cy + (icy - s.h / 2) / k,
      };
    },
    []
  );

  /** The whole map, or these points, framed inside the free area */
  const fitFree = React.useCallback(
    (points?: [number, number][]): View => {
      const s = sizeRef.current;
      const b = live.current.map.focus ?? live.current.map.bounds;
      const i = live.current.insets ?? { top: 0, right: 0, bottom: 0, left: 0 };
      const free = {
        w: Math.max(120, s.w - i.left - i.right),
        h: Math.max(120, s.h - i.top - i.bottom),
      };
      if (points && points.length) {
        const v = fitPoints(points, b, free, minSpan * 3);
        return framed(v.cx, v.cy, v.span);
      }
      const v = fitView(b, free);
      return framed(v.cx, v.cy, v.span);
    },
    [framed, minSpan]
  );

  const draw = React.useCallback(() => {
    rafRef.current = 0;
    const canvas = canvasRef.current;
    const s = sizeRef.current;
    if (!canvas || s.w === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const {
      map: m,
      markers: marks,
      spawns: sets,
      time: tod,
      selectedId: sel,
    } = live.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, s.w, s.h);

    const view = viewRef.current;
    const scale = pxPerUnit(view, s);
    const b = m.bounds;

    // the picture: only the part that is on screen, from the best version loaded
    const low = lowRef.current;
    const hi = fullRef.current;
    if (
      low &&
      !fullRequested.current &&
      scale > (low.naturalWidth / (b.right - b.left)) * 0.85
    ) {
      fullRequested.current = true;
      const img = new Image();
      img.onload = () => {
        if (live.current.map !== m) return; // the map changed while it loaded
        fullRef.current = img;
        requestDraw();
      };
      img.src = m.full;
    }
    const img = hi ?? low;
    if (img) {
      const [x0, y0] = toWorld(view, s, 0, 0);
      const [x1, y1] = toWorld(view, s, s.w, s.h);
      const mw = b.right - b.left;
      const mh = b.top - b.bottom;
      const u0 = clamp((x0 - b.left) / mw, 0, 1);
      const u1 = clamp((x1 - b.left) / mw, 0, 1);
      const v0 = clamp((b.top - y0) / mh, 0, 1);
      const v1 = clamp((b.top - y1) / mh, 0, 1);
      if (u1 > u0 && v1 > v0) {
        const [dx0, dy0] = toScreen(view, s, b.left + u0 * mw, b.top - v0 * mh);
        const [dx1, dy1] = toScreen(view, s, b.left + u1 * mw, b.top - v1 * mh);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          img,
          u0 * img.naturalWidth,
          v0 * img.naturalHeight,
          (u1 - u0) * img.naturalWidth,
          (v1 - v0) * img.naturalHeight,
          dx0,
          dy0,
          dx1 - dx0,
          dy1 - dy0
        );
      }
    }

    // spawn points: one path per Pal, so overlaps stay one flat colour
    const pr = clamp(scale * 7, 2, 10);
    for (const set of sets) {
      const pts = [
        ...(tod !== 'night' ? set.day : []),
        ...(tod !== 'day' ? set.night : []),
      ];
      ctx.fillStyle = set.colour;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      for (const [x, y] of pts) {
        const [sx, sy] = toScreen(view, s, x, y);
        if (sx < -pr || sy < -pr || sx > s.w + pr || sy > s.h + pr) continue;
        ctx.moveTo(sx + pr, sy);
        ctx.arc(sx, sy, pr, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // markers, with the selected one on top; names appear as you zoom in
    const zoom = fitSpan(b, s) / view.span;
    const r = clamp(4.2 + 2.7 * Math.log2(Math.max(zoom, 0.5)), 3.6, 13);
    const labelled = zoom > 2.6;
    const taken = new Set<string>();
    const onScreen = marks
      .map((mk) => ({ mk, p: toScreen(view, s, mk.x, mk.y) }))
      .filter(
        ({ p }) =>
          p[0] > -20 && p[1] > -20 && p[0] < s.w + 20 && p[1] < s.h + 20
      )
      .sort((a, c) => Number(a.mk.id === sel) - Number(c.mk.id === sel));
    for (const { mk, p } of onScreen) {
      const def = layerById.get(mk.layer);
      if (!def) continue;
      const selected = mk.id === sel;
      const rr = selected ? r + 2 : r;
      if (selected) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], rr + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(p[0], p[1], rr, 0, Math.PI * 2);
      ctx.fillStyle = def.colour;
      ctx.fill();
      ctx.lineWidth = rr < 6 ? 1.2 : 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      if (rr >= 8) {
        const pic = mk.pal ? icon(mk.pal, requestDraw) : undefined;
        if (pic) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p[0], p[1], rr - 1.5, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(pic, p[0] - rr, p[1] - rr, rr * 2, rr * 2);
          ctx.restore();
        } else {
          ctx.fillStyle = '#fff';
          ctx.font = `700 ${Math.round(rr * 1.15)}px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(def.glyph, p[0], p[1] + 0.5);
        }
      }
      if (labelled || selected) {
        const cell = `${Math.floor(p[0] / 80)},${Math.floor(p[1] / 18)}`;
        if (!selected && taken.has(cell)) continue;
        taken.add(cell);
        ctx.font = '600 12px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(8,20,32,0.9)';
        ctx.strokeText(mk.name, p[0] + rr + 5, p[1]);
        ctx.fillStyle = '#fff';
        ctx.fillText(mk.name, p[0] + rr + 5, p[1]);
      }
    }
    // requestDraw is built from this callback and never changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestDraw = React.useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  /** Applies a view, redraws, and tells the parent once it settles */
  const setView = React.useCallback(
    (next: View) => {
      viewRef.current = clampView(
        next,
        live.current.map.bounds,
        sizeRef.current,
        minSpan
      );
      requestDraw();
      window.clearTimeout(notifyTimer.current);
      notifyTimer.current = window.setTimeout(
        () => live.current.onViewChange?.(viewRef.current),
        400
      );
    },
    [minSpan, requestDraw]
  );

  /** The view after zooming by `factor` around a point on the screen */
  const zoomed = React.useCallback(
    (factor: number, sx: number, sy: number) =>
      zoomAround(
        viewRef.current,
        sizeRef.current,
        factor,
        sx,
        sy,
        live.current.map.bounds,
        minSpan
      ),
    [minSpan]
  );

  const fly = React.useCallback(
    (to: View) => {
      cancelAnimationFrame(flyRef.current);
      const from = viewRef.current;
      const target = clampView(
        to,
        live.current.map.bounds,
        sizeRef.current,
        minSpan
      );
      const start = performance.now();
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      const step = (now: number) => {
        const t = reduce ? 1 : Math.min(1, (now - start) / 450);
        const e = easeInOut(t);
        // zoom in the log domain so it feels even, and move the centre with it
        const span = Math.exp(
          Math.log(from.span) +
            (Math.log(target.span) - Math.log(from.span)) * e
        );
        setView({
          cx: from.cx + (target.cx - from.cx) * e,
          cy: from.cy + (target.cy - from.cy) * e,
          span,
        });
        if (t < 1) flyRef.current = requestAnimationFrame(step);
      };
      flyRef.current = requestAnimationFrame(step);
    },
    [minSpan, setView]
  );

  React.useImperativeHandle(
    ref,
    () => ({
      flyTo: (x, y, span) =>
        fly(framed(x, y, span ?? Math.min(viewRef.current.span, minSpan * 5))),
      fit: (points) => fly(fitFree(points)),
      zoomBy: (factor) => {
        const s = sizeRef.current;
        fly(zoomed(factor, s.w / 2, s.h / 2));
      },
      reset: () => fly(fitFree()),
    }),
    [fly, fitFree, framed, minSpan, zoomed]
  );

  // follow the size of the box
  React.useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => {
      const next = { w: el.clientWidth, h: el.clientHeight };
      const first = sizeRef.current.w === 0;
      const prev = sizeRef.current;
      sizeRef.current = next;
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(next.w * dpr);
        canvas.height = Math.round(next.h * dpr);
      }
      if (first && next.w > 0) {
        viewRef.current = clampView(
          initialView ?? fitFree(),
          live.current.map.bounds,
          next,
          minSpan
        );
      } else if (prev.w > 0 && next.w > 0) {
        // keep the same ground in view when the box changes shape
        viewRef.current = clampView(
          {
            ...viewRef.current,
            span: (viewRef.current.span * next.w) / prev.w,
          },
          live.current.map.bounds,
          next,
          minSpan
        );
      }
      setSize(next);
      requestDraw();
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
    // the initial view only matters on the first measurement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load the small picture for this map, and start from the whole map when it changes
  const firstMap = React.useRef(true);
  React.useEffect(() => {
    setReady(false);
    lowRef.current = undefined;
    fullRef.current = undefined;
    fullRequested.current = false;
    window.clearTimeout(notifyTimer.current); // a view on the old map means nothing here
    if (!firstMap.current && sizeRef.current.w > 0) {
      viewRef.current = fitFree();
    }
    firstMap.current = false;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      lowRef.current = img;
      setReady(true);
      requestDraw();
    };
    img.src = map.image;
    requestDraw();
    return () => {
      cancelled = true;
    };
  }, [map, fitFree, requestDraw]);

  React.useEffect(
    () => requestDraw(),
    [markers, spawns, time, selectedId, size, requestDraw]
  );
  React.useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0; // or a later redraw would think one is still queued
      cancelAnimationFrame(flyRef.current);
      window.clearTimeout(notifyTimer.current);
    },
    []
  );

  // wheel zoom needs a listener that can stop the page scrolling as well
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(flyRef.current);
      const rect = canvas.getBoundingClientRect();
      setView(
        zoomed(
          Math.exp(e.deltaY * 0.0016),
          e.clientX - rect.left,
          e.clientY - rect.top
        )
      );
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [setView, zoomed]);

  // pointers: one finger or the mouse pans, two fingers pinch, a quick touch is a tap
  const pointers = React.useRef(new Map<number, [number, number]>());
  const moved = React.useRef(0);
  const local = (e: React.PointerEvent): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };
  const hit = (sx: number, sy: number, touch: boolean) =>
    nearestMarker(
      live.current.markers,
      viewRef.current,
      sizeRef.current,
      sx,
      sy,
      touch ? 26 : 16
    );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    cancelAnimationFrame(flyRef.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    moved.current = 0;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = local(e);
    const s = sizeRef.current;
    if (coordsRef.current) {
      const [wx, wy] = toWorld(viewRef.current, s, pos[0], pos[1]);
      coordsRef.current.textContent = formatCoords(wx, wy);
    }
    const prev = pointers.current.get(e.pointerId);
    if (!prev) {
      // hovering with a mouse
      if (e.pointerType === 'mouse') {
        const m = hit(pos[0], pos[1], false);
        setHover((h) =>
          m
            ? h?.marker.id === m.id
              ? h
              : { marker: m, x: pos[0], y: pos[1] }
            : h
              ? undefined
              : h
        );
      }
      return;
    }
    setHover(undefined);
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
        setView(
          zoomed(before / after, (pos[0] + o[0]) / 2, (pos[1] + o[1]) / 2)
        );
    } else {
      const v = viewRef.current;
      const k = pxPerUnit(v, s);
      setView({
        ...v,
        cx: v.cx - (pos[0] - prev[0]) / k,
        cy: v.cy + (pos[1] - prev[1]) / k,
      });
    }
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const wasTap = pointers.current.size === 1 && moved.current < 6;
    pointers.current.delete(e.pointerId);
    if (wasTap) {
      const pos = local(e);
      onSelect(hit(pos[0], pos[1], e.pointerType !== 'mouse'));
    }
  };
  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    fly(zoomed(0.5, e.clientX - rect.left, e.clientY - rect.top));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const v = viewRef.current;
    const step = v.span * 0.12;
    const s = sizeRef.current;
    const zoomKey = (factor: number) => () =>
      setView(zoomed(factor, s.w / 2, s.h / 2));
    const keys: Record<string, () => void> = {
      ArrowLeft: () => setView({ ...v, cx: v.cx - step }),
      ArrowRight: () => setView({ ...v, cx: v.cx + step }),
      ArrowUp: () => setView({ ...v, cy: v.cy + step }),
      ArrowDown: () => setView({ ...v, cy: v.cy - step }),
      '+': zoomKey(0.7),
      '=': zoomKey(0.7),
      '-': zoomKey(1 / 0.7),
      '0': () => fly(fitFree()),
      Escape: () => onSelect(undefined),
    };
    const run = keys[e.key];
    if (run) {
      e.preventDefault();
      cancelAnimationFrame(flyRef.current);
      run();
    }
  };

  return (
    <div
      ref={wrapRef}
      role="application"
      tabIndex={0}
      aria-label={`${map.name} map. Arrow keys pan, plus and minus zoom, zero shows the whole map. Use search and the layers panel to find places.`}
      onKeyDown={onKeyDown}
      style={{ backgroundColor: BACKGROUND }}
      className={cn(
        'relative size-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-pw-teal focus-visible:ring-inset',
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full cursor-grab touch-none active:cursor-grabbing"
        style={{
          width: size.w,
          height: size.h,
          cursor: hover ? 'pointer' : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        onPointerLeave={() => {
          setHover(undefined);
          if (coordsRef.current) coordsRef.current.textContent = '–';
        }}
        onDoubleClick={onDoubleClick}
      />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/70">
          Loading the {map.name} map…
        </div>
      )}
      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 max-w-60 -translate-x-1/2 -translate-y-full rounded-lg bg-pw-deep/95 px-2.5 py-1.5 text-xs text-white shadow-lift ring-1 ring-white/15"
          style={{ left: hover.x, top: hover.y - 16 }}
        >
          <span className="font-semibold">{hover.marker.name}</span>
          <span className="block text-white/60">
            {layerById.get(hover.marker.layer)?.label}
            {hover.marker.level ? ` · Lv. ${hover.marker.level}` : ''}
          </span>
        </div>
      )}
      <div
        className="pointer-events-none absolute bottom-1.5 left-2 z-10 rounded bg-pw-deep/80 px-1.5 py-0.5 font-mono text-[11px] text-white/80"
        aria-hidden="true"
      >
        X, Y <span ref={coordsRef}>–</span>
      </div>
    </div>
  );
});

export default WorldMap;
