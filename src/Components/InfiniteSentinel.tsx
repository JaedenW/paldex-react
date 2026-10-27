import type { Ref } from 'react';
import { buttonClass } from './ui';

/**
 * Goes after a list that uses useInfiniteScroll. Browsers without
 * IntersectionObserver get a button instead.
 */
export default function InfiniteSentinel({
  sentinelRef,
  hasMore,
  showAll,
}: {
  sentinelRef: Ref<HTMLDivElement>;
  hasMore: boolean;
  showAll: () => void;
}) {
  if (!hasMore) return null;
  if (typeof IntersectionObserver === 'undefined') {
    return (
      <div className="mt-6 text-center">
        <button
          type="button"
          className={buttonClass('primary')}
          onClick={showAll}
        >
          Show the rest
        </button>
      </div>
    );
  }
  return (
    <div
      ref={sentinelRef}
      className="py-6 text-center text-sm text-pw-muted"
      role="status"
    >
      Loading more…
    </div>
  );
}
