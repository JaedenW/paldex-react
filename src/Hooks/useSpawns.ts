import React from 'react';
import type { Spawns } from '../types';

// Each Pal's spawn points are fetched once; a failed fetch can be tried again
const requests = new Map<string, Promise<Spawns>>();

function loadSpawns(id: string) {
  let request = requests.get(id);
  if (!request) {
    request = fetch(`/habitats/${id}.json`).then((r) =>
      r.ok
        ? (r.json() as Promise<Spawns>)
        : Promise.reject(new Error(String(r.status)))
    );
    request.catch(() => requests.delete(id));
    requests.set(id, request);
  }
  return request;
}

type State = { id: string; spawns?: Spawns; failed?: boolean };

/** Loads one Pal's spawn points from public/habitats when it has any */
export function useSpawns(id: string, available: boolean) {
  const [state, setState] = React.useState<State>({ id });

  React.useEffect(() => {
    if (!available) return;
    let cancelled = false;
    loadSpawns(id)
      .then((spawns) => !cancelled && setState({ id, spawns }))
      .catch(() => !cancelled && setState({ id, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [id, available]);

  const current = state.id === id ? state : { id };
  return {
    spawns: current.spawns,
    loading: available && !current.spawns && !current.failed,
    failed: !!current.failed,
  };
}

/** Several Pals' spawn points by id: null if they failed, absent until loaded */
export function useSpawnsOf(ids: string[]) {
  const [data, setData] = React.useState<Record<string, Spawns | null>>({});
  const key = ids.join(',');
  React.useEffect(() => {
    if (!key) return;
    let cancelled = false;
    for (const id of key.split(',')) {
      loadSpawns(id)
        .catch(() => null)
        .then((spawns) => {
          if (!cancelled)
            setData((d) => (d[id] === spawns ? d : { ...d, [id]: spawns }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [key]);
  return data;
}
