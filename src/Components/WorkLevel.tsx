import { cn } from '../Utils/cn';

export const MAX_WORK_LEVEL = 8;

/** A row of diamonds plus the number, so levels above 4 aren't cut off */
export default function WorkLevel({ level }: { level: number }) {
  return (
    <span className="flex items-center gap-2" aria-label={`Level ${level}`}>
      <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: MAX_WORK_LEVEL }, (_, i) => (
          <span
            key={i}
            className={cn(
              'size-2 rotate-45',
              i < level ? 'bg-pw-sun' : 'bg-pw-line'
            )}
          />
        ))}
      </span>
      <span className="w-3 text-right font-display text-lg leading-none font-bold">
        {level}
      </span>
    </span>
  );
}
