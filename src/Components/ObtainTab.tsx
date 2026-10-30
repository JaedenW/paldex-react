import React from 'react';
import { Link } from 'react-router';
import { breeder, obtain } from '../data';
import { markerById } from '../data/worldmap';
import ParentPairList from './ParentPairList';
import PalMap, { mainMapLink, type MapFocus } from './PalMap';
import { Panel, Stat } from './ui';
import { useSpawns } from '../Hooks/useSpawns';
import { cn } from '../Utils/cn';
import { formatCoords, hotspots } from '../Utils/map';
import { formatNumber, slugify } from '../Utils/text';
import type { Boss, Pal, Spawns } from '../types';

const coords =
  'rounded-md bg-pw-cream px-1.5 py-0.5 font-mono text-sm font-semibold whitespace-nowrap';
const place = 'flex flex-col gap-2 rounded-2xl border bg-pw-cream/30 p-3';
const link = 'font-semibold text-pw-link hover:underline';

function ShowOnMap({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start text-sm font-semibold whitespace-nowrap text-pw-link hover:underline"
    >
      Show on map
    </button>
  );
}

/** When it appears, going by its spawn points */
function activeTime(pal: Pal, spawns?: Spawns) {
  if (spawns?.day.length && spawns.night.length) return 'Day and night';
  if (spawns?.day.length) return 'Day only';
  if (spawns?.night.length) return 'Night only';
  return pal.nocturnal ? 'Mostly at night' : undefined;
}

export default function ObtainTab({ pal }: { pal: Pal }) {
  const info = obtain[pal.id] ?? {};
  const { spawns, loading, failed } = useSpawns(pal.id, !!info.spawns);
  const [focus, setFocus] = React.useState<MapFocus>();
  const focusOn = (target: Omit<MapFocus, 'key'>) =>
    setFocus({ ...target, key: Date.now() });

  const bosses = info.bosses ?? [];
  const placed = bosses.filter(
    (b): b is Boss & { x: number; y: number } => b.x !== undefined
  );
  const spots = React.useMemo(() => (spawns ? hotspots(spawns) : []), [spawns]);
  const parents = React.useMemo(() => breeder.parentsOf(pal), [pal]);
  const treePlaces = (info.tree?.places ?? []).flatMap(
    (id) => markerById.get(id) ?? []
  );
  const onTree = !!info.tree || bosses.some((b) => b.map === 'tree');
  const hasMap = !!info.spawns || placed.length > 0 || onTree;
  const alpha = bosses.filter((b) => b.variant === 'Alpha');
  const other = bosses.filter((b) => b.variant !== 'Alpha');
  const prose = info.prose?.join(' ') ?? '';
  const time = activeTime(pal, spawns);

  // A summary of every way to get this Pal, so nothing hides further down the page
  const ways = [
    info.spawns && 'Wild spawns',
    onTree && 'World Tree',
    alpha.length > 0 && 'Alpha boss',
    other.some((b) => b.variant === 'Predator') && 'Predator Pal',
    info.dungeons?.length && 'Dungeon boss',
    info.raid && 'Raid boss',
    /\bincidents?\b/i.test(prose) && 'Incidents',
    /\bcaged\b/i.test(prose) && 'Caged in camps',
    info.regions?.some((r) => r.includes('Wildlife Sanctuary')) &&
      'Wildlife Sanctuary',
    parents.length > 0 && 'Breeding',
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
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {time && <Stat label="Active">{time}</Stat>}
          <Stat label="Capture rate">
            {formatNumber(pal.stats.captureRate, 2)}×
          </Stat>
          {info.spawns ? (
            <Stat label="Spawn points">{formatNumber(info.spawns)}</Stat>
          ) : null}
          <Stat label="Parent pairs">{formatNumber(parents.length)}</Stat>
        </dl>
        {prose && (
          <div className="mt-4 space-y-2 text-pw-ink">
            {info.prose?.map((p) => (
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
        <Panel
          title="Map"
          actions={
            <Link
              to={mainMapLink(pal, info)}
              className="text-sm font-semibold text-pw-link hover:underline"
            >
              Open on the world map
            </Link>
          }
        >
          {loading && (
            <p className="mb-2 text-sm text-pw-muted">Loading spawn points…</p>
          )}
          {failed && (
            <p className="mb-2 text-sm text-red-700 dark:text-red-300">
              Couldn’t load this Pal’s spawn points.
            </p>
          )}
          <PalMap pal={pal} info={info} spawns={spawns} focus={focus} />
          <p className="mt-2 text-xs text-pw-muted">
            Coordinates are the in-game map’s X, Y. Spawn points are the wiki’s
            habitat data and show where it can appear, not how often. Tap the
            map to read off a position.
          </p>
        </Panel>
      )}

      {info.tree && (
        <Panel title="On the World Tree">
          <p className="mb-3 text-sm text-pw-muted">
            The wiki has no exact spawn points for the World Tree, so these are
            the regions it names.
            {info.tree.widespread &&
              (treePlaces.length > 0
                ? ' It also turns up elsewhere on the Tree.'
                : ` ${pal.name} can be found widely across it.`)}
          </p>
          {treePlaces.length > 0 && (
            <ul className="grid-fluid [--min:15rem]">
              {treePlaces.map((m) => (
                <li key={m.id} className={place}>
                  <span className="font-display text-xl leading-tight font-bold">
                    {m.name}
                  </span>
                  <code className={cn(coords, 'self-start')}>
                    {formatCoords(m.x, m.y)}
                  </code>
                  <ShowOnMap
                    onClick={() =>
                      focusOn({
                        map: 'tree',
                        x: m.x,
                        y: m.y,
                        markerId: m.id,
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {spots.length > 0 && (
        <Panel title="Best places to look">
          <p className="mb-3 text-sm text-pw-muted">
            The areas with the most spawn points, busiest first.
          </p>
          <ol className="grid-fluid [--min:15rem]">
            {spots.map((s, i) => (
              <li key={`${s.x},${s.y}`} className={place}>
                <span className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pw-sun font-display font-bold text-pw-deep">
                    {i + 1}
                  </span>
                  <code className={coords}>{formatCoords(s.x, s.y)}</code>
                </span>
                <span className="text-sm text-pw-muted">
                  {s.count} spawn point{s.count === 1 ? '' : 's'} ·{' '}
                  {s.day && s.night
                    ? 'day and night'
                    : s.day
                      ? 'day only'
                      : 'night only'}
                </span>
                <ShowOnMap
                  onClick={() => focusOn({ map: 'world', x: s.x, y: s.y })}
                />
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
          <ul className="grid-fluid [--min:17rem]">
            {bosses.map((b, i) => (
              <li key={b.markerId ?? `${b.variant}${i}`} className={place}>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-pw-navy px-2.5 py-0.5 text-xs font-semibold text-white">
                    {b.variant}
                  </span>
                  {b.level && (
                    <span className="font-semibold">Lv. {b.level}</span>
                  )}
                  {b.location && <span>{b.location}</span>}
                  {b.map === 'tree' && (
                    <span className="text-sm text-pw-muted">World Tree</span>
                  )}
                </span>
                {b.x !== undefined && b.y !== undefined ? (
                  <>
                    <code className={cn(coords, 'self-start')}>
                      {b.approximate && '≈ '}
                      {formatCoords(b.x, b.y)}
                    </code>
                    {b.approximate && (
                      <span className="text-sm text-pw-muted">
                        An estimate: the wiki names the area but not the spot.
                      </span>
                    )}
                    <ShowOnMap
                      onClick={() =>
                        focusOn({
                          map: b.map,
                          x: b.x as number,
                          y: b.y as number,
                          markerId: b.markerId,
                        })
                      }
                    />
                  </>
                ) : (
                  <span className="text-sm text-pw-muted">
                    The wiki lists this boss but not where it is.
                  </span>
                )}
                {b.note && (
                  <span className="text-sm text-pw-muted">{b.note}</span>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {info.dungeons && info.dungeons.length > 0 && (
        <Panel title="Dungeons">
          <ul className="grid-fluid [--min:16rem]">
            {info.dungeons.map((d) => (
              <li
                key={d.name}
                className="rounded-2xl border bg-pw-cream/30 p-3"
              >
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
          {info.slabs && (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {info.slabs.map((s) => (
                <li key={s.name}>
                  {s.id ? (
                    <Link to={`/item/${s.id}`} className={link}>
                      {s.name}
                    </Link>
                  ) : (
                    s.name
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Panel
        title="Breeding and eggs"
        actions={
          parents.length > 0 ? (
            <Link
              to={`/breeding?mode=find&c=${pal.id}`}
              className="text-sm font-semibold text-pw-link hover:underline"
            >
              All {formatNumber(parents.length)} pairs
            </Link>
          ) : undefined
        }
      >
        <p>
          Hatches from a{' '}
          {pal.breeding.egg ? (
            <Link to={`/item/${slugify(pal.breeding.egg)}`} className={link}>
              {pal.breeding.egg}
            </Link>
          ) : (
            'Pal egg'
          )}
          {info.eggTemperature && (
            <>
              , which prefers <b>{info.eggTemperature.toLowerCase()}</b>{' '}
              temperatures
            </>
          )}{' '}
          (breeding rank {pal.breeding.rank}). Eggs of this kind also turn up in
          the wild; the egg’s page says where.
        </p>
        {parents.length > 0 ? (
          <div className="mt-4">
            <ParentPairList pairs={parents} first={4} resetKey={pal.id} />
          </div>
        ) : (
          <p className="mt-2 text-pw-muted">
            No parent pair produces {pal.name}, so it can’t be bred.
          </p>
        )}
      </Panel>

      <Panel title="Buying one">
        <p className="text-pw-muted">
          Pal Merchants and Black Marketeers sell Pals for Gold Coins, from a
          stock that changes. The wiki doesn’t list which Pals each one carries,
          so check them when you pass.
        </p>
      </Panel>

      {!info.spawns &&
        !onTree &&
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
