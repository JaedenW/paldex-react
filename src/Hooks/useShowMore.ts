import React from 'react';

/**
 * Reveals a long list a step at a time on request, for lists where a button is
 * kinder than endless scrolling. `resetKey` starts over from the first page.
 */
export function useShowMore(
  total: number,
  first: number,
  step: number,
  resetKey = ''
) {
  const [limit, setLimit] = React.useState(first);
  React.useEffect(() => setLimit(first), [resetKey, first]);
  const shown = Math.min(limit, total);
  return {
    shown,
    next: Math.min(step, total - shown),
    showMore: () => setLimit((l) => l + step),
  };
}
