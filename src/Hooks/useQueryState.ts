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
