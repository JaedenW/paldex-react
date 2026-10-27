import React from 'react';

/**
 * Reveals a long list a page at a time as the reader scrolls. Put
 * `sentinelRef` on an element after the list; when it comes within 600px of
 * the screen the next page is shown. `resetKey` starts the list over from the
 * first page when it changes, such as when a filter does.
 */
export function useInfiniteScroll(
  total: number,
  pageSize: number,
  resetKey = ''
) {
  const [limit, setLimit] = React.useState(pageSize);
  const [node, setNode] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => setLimit(pageSize), [resetKey, pageSize]);

  const hasMore = limit < total;
  React.useEffect(() => {
    if (!node || !hasMore || typeof IntersectionObserver === 'undefined')
      return;
    // a new observer per page, so a sentinel that is still on screen asks for the next one
    const observer = new IntersectionObserver(
      ([entry]) =>
        entry.isIntersecting && setLimit((l) => Math.min(l + pageSize, total)),
      { rootMargin: '600px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, hasMore, limit, total, pageSize]);

  return {
    limit,
    hasMore,
    sentinelRef: setNode,
    /** Shows the rest at once; used where there is no IntersectionObserver */
    showAll: () => setLimit(total),
  };
}
