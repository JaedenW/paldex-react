import React from 'react';

export type ThemePref = 'system' | 'light' | 'dark';

/**
 * The one thing this app remembers on the device: whether you picked a light or
 * dark theme. "System" (the default) stores nothing and follows the device.
 */
const KEY = 'paldex.theme';

export function resolveTheme(
  pref: ThemePref,
  systemDark: boolean
): 'light' | 'dark' {
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
}

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system'; // storage blocked: just follow the device
  }
}

const query =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : undefined;
let pref: ThemePref = typeof window !== 'undefined' ? readPref() : 'system';
const listeners = new Set<() => void>();

function apply() {
  document.documentElement.dataset.theme = resolveTheme(
    pref,
    query?.matches ?? false
  );
}

export function setThemePref(next: ThemePref) {
  pref = next;
  try {
    if (next === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    /* the choice still applies until the page is closed */
  }
  apply();
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  apply();
  // while following the device, switch when the device does
  query?.addEventListener('change', () => pref === 'system' && apply());
}

export function useThemePref(): ThemePref {
  return React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => pref,
    () => 'system'
  );
}
