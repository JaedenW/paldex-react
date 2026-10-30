import React from 'react';
import { useLocation } from 'react-router';

/** Scrolls to the element a #link in the address points at, and returns the hash */
export function useHashTarget() {
  const { hash } = useLocation();
  React.useEffect(() => {
    if (hash)
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ block: 'center' });
  }, [hash]);
  return hash;
}
