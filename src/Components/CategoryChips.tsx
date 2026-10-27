import { Chip } from './ui';
import type { Category } from '../Utils/tech';

/**
 * Filter chips that split a long list by category, biggest category first,
 * each with its count. Shows nothing when there is only one category.
 */
export default function CategoryChips<T>({
  items,
  category,
  value,
  onChange,
}: {
  items: T[];
  category: (item: T) => Category;
  /** The chosen category key, or '' for all */
  value: string;
  onChange: (key: string) => void;
}) {
  const counts = new Map<string, { label: string; count: number }>();
  for (const item of items) {
    const c = category(item);
    counts.set(c.key, {
      label: c.label,
      count: (counts.get(c.key)?.count ?? 0) + 1,
    });
  }
  if (counts.size < 2) return null;
  const sorted = [...counts].sort(
    (a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label)
  );
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">
      <Chip active={!value} onClick={() => onChange('')}>
        All ({items.length})
      </Chip>
      {sorted.map(([key, { label, count }]) => (
        <Chip
          key={key}
          active={value === key}
          onClick={() => onChange(value === key ? '' : key)}
        >
          {label} ({count})
        </Chip>
      ))}
    </div>
  );
}
