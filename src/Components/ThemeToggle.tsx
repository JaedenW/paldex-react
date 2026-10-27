import { MonitorIcon, MoonIcon, SunIcon } from './Icons';
import { setThemePref, useThemePref, type ThemePref } from '../Utils/theme';
import { cn } from '../Utils/cn';

const CHOICES: { value: ThemePref; label: string; icon: typeof SunIcon }[] = [
  { value: 'system', label: 'Auto', icon: MonitorIcon },
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
];

/**
 * Light, dark, or follow the device. Styled for the dark side menu it lives in.
 * Only a light or dark choice is remembered; Auto stores nothing.
 */
export default function ThemeToggle() {
  const pref = useThemePref();
  return (
    <div
      role="group"
      aria-label="Theme"
      className="mx-4 mb-3 flex rounded-xl bg-white/10 p-1 ring-1 ring-white/15"
    >
      {CHOICES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={pref === value}
          title={
            value === 'system' ? 'Match the device setting' : `${label} theme`
          }
          onClick={() => setThemePref(value)}
          className={cn(
            'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition',
            pref === value
              ? 'bg-pw-sun text-pw-deep'
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
