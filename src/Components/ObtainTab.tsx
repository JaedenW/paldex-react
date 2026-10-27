import React from 'react';
import { Link } from 'react-router';
import { obtain } from '../data';
import PalMap, { type MapFocus } from './PalMap';
import { Panel } from './ui';
import { useSpawns } from '../Hooks/useSpawns';
import { formatCoords, hotspots } from '../Utils/map';
import type { Pal } from '../types';

const coords =
  'rounded-md bg-pw-cream px-1.5 py-0.5 font-mono text-sm font-semibold whitespace-nowrap';

function ShowOnMap({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-semibold whitespace-nowrap text-pw-teal-dark hover:underline"
    >
      Show on map
    </button>
  );
}

export default function ObtainTab({ pal }: { pal: Pal }) {
  const info = obtain[pal.id] ?? {};
  const { spawns, loading, failed } = useSpawns(pal.id, !!info.spawns);
  const [focus, setFocus] = React.useState<MapFocus>();
  const focusOn = (x: number, y: number) => setFocus({ x, y, key: Date.now() });

  const bosses = info.bosses ?? [];
  const spots = React.useMemo(() => (spawns ? hotspots(spawns) : []), [spawns]);
  const hasMap = !!info.spawns || bosses.length > 0;
  const alpha = bosses.filter((b) => b.variant === 'Alpha');
  const other = bosses.filter((b) => b.variant !== 'Alpha');

  // A summary of every way to get this Pal, so nothing hides further down the page
  const ways = [
    info.spawns && 'Wild spawns',
    alpha.length > 0 && 'Alpha boss',
    other.some((b) => b.variant === 'Predator') && 'Predator Pal',
    info.dungeons?.length && 'Dungeon boss',
    info.raid && 'Raid boss',
    pal.breeding && 'Breeding',
  ].filter(Boolean) as string[];

  return (
    <>
      <Panel title={`Getting ${pal.name}`}>
        <ul className="flex flex-wrap gap-2">
          {ways.map((w) => (
            <li
              key={w}
              className="rounded-full bg-pw-navy px-3.5 py-1 text-sm font-semibold text-white"
            >
              {w}
            </li>
          ))}
        </ul>
        {info.prose && (
          <div className="mt-4 space-y-2 text-pw-ink">
            {info.prose.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        )}
        {info.regions && (
          <p className="mt-4 text-sm">
            <span className="font-semibold">Regions: </span>
            <span className="text-pw-muted">{info.regions.join(', ')}</span>
          </p>
        )}
      </Panel>

      {hasMap && (
        <Panel title="Map">
          {loading && (
            <p className="mb-2 text-sm text-pw-muted">Loading spawn points…</p>
          )}
          {failed && (
            <p className="mb-2 text-sm text-red-700">
              Couldn’t load this Pal’s spawn points.
            </p>
          )}
          <PalMap spawns={spawns} bosses={bosses} focus={focus} />
          <p className="mt-2 text-xs text-pw-muted">
            Coordinates are the in-game map’s X, Y. Spawn points are the wiki’s
            habitat data and show where it can appear, not how often.
          </p>
        </Panel>
      )}

      {spots.length > 0 && (
        <Panel title="Best places to look">
          <p className="mb-3 text-sm text-pw-muted">
            The areas with the most spawn points, busiest first.
          </p>
          <ol className="divide-y">
            {spots.map((s, i) => (
              <li
                key={`${s.x},${s.y}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-pw-sun font-display font-bold text-pw-deep">
                  {i + 1}
                </span>
                <code className={coords}>{formatCoords(s.x, s.y)}</code>
                <span className="text-sm text-pw-muted">
                  {s.count} spawn point{s.count === 1 ? '' : 's'} ·{' '}
                  {s.day && s.night
                    ? 'day and night'
                    : s.day
                      ? 'day only'
                      : 'night only'}
                </span>
                <span className="ml-auto">
                  <ShowOnMap onClick={() => focusOn(s.x, s.y)} />
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {bosses.length > 0 && (
        <Panel
          title={
            alpha.length && !other.length ? 'Alpha boss' : 'Boss locations'
          }
        >
          <ul className="divide-y">
            {bosses.map((b) => (
              <li
                key={`${b.variant}${b.x},${b.y}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
              >
                <span className="rounded-full bg-pw-navy px-2.5 py-0.5 text-xs font-semibold text-white">
                  {b.variant}
                </span>
                {b.level && (
                  <span className="font-semibold">Lv. {b.level}</span>
                )}
                {b.location && <span>{b.location}</span>}
                <code className={coords}>{formatCoords(b.x, b.y)}</code>
                {b.note && (
                  <span className="text-sm text-pw-muted">{b.note}</span>
                )}
                <span className="ml-auto">
                  <ShowOnMap onClick={() => focusOn(b.x, b.y)} />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {info.dungeons && info.dungeons.length > 0 && (
        <Panel title="Dungeons">
          <ul className="divide-y">
            {info.dungeons.map((d) => (
              <li key={d.name} className="py-2.5">
                <p className="font-display text-xl font-bold">{d.name}</p>
                {d.note && <p className="text-sm text-pw-muted">{d.note}</p>}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {info.raid && (
        <Panel title="Raid boss">
          <p>{info.raid}</p>
        </Panel>
      )}

      <Panel title="Breeding">
        <p>
          Hatches from a <b>{pal.breeding.egg || 'Pal egg'}</b> (breeding rank{' '}
          {pal.breeding.rank}).{' '}
          <Link
            to={`/pal/${pal.id}?tab=breeding`}
            className="font-semibold text-pw-teal-dark hover:underline"
          >
            See which parents produce {pal.name}
          </Link>
        </p>
      </Panel>

      {!info.spawns &&
        bosses.length === 0 &&
        !info.dungeons?.length &&
        !info.raid && (
          <p className="text-sm text-pw-muted">
            The wiki has no spawn locations for {pal.name} yet, so there’s no
            map. The text above is all it says about where to find it.
          </p>
        )}
    </>
  );
}
