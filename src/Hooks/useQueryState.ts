import React from 'react';
import { useSearchParams } from 'react-router';

/**
 * Keeps a string value in the URL (?key=value) so filters survive reloads and
 * can be shared. A value equal to the fallback is left out of the URL.
 */
export function useQueryState(
  key: string,
  fallback = ''
): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? fallback;
  const set = React.useCallback(
    (v: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === fallback || v === '') next.delete(key);
          else next.set(key, v);
          return next;
        },
        { replace: true }
      ),
    [key, fallback, setParams]
  );
  return [value, set];
}

/**
 * Changes several URL values in one update. Calling two `useQueryState`
 * setters one after the other loses the first change, since each builds on the
 * URL as it was when the page last rendered; use this when one action sets more
 * than one value. An empty or undefined value removes the key.
 */
export function useQueryPatch() {
  const [, setParams] = useSearchParams();
  return React.useCallback(
    (changes: Record<string, string | undefined>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );
}
