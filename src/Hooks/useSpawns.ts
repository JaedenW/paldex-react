import React from 'react';
import type { Spawns } from '../types';

type State = { id: string; spawns?: Spawns; failed?: boolean };

/** Loads one Pal's spawn points from public/habitats when it has any */
export function useSpawns(id: string, available: boolean) {
  const [state, setState] = React.useState<State>({ id });

  React.useEffect(() => {
    if (!available) return;
    let cancelled = false;
    fetch(`/habitats/${id}.json`)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<Spawns>)
          : Promise.reject(new Error(String(r.status)))
      )
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
