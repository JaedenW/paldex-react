import { Link, useLocation } from 'react-router';
import MoreMenu from './MoreMenu';
import { MoreIcon } from './Icons';
import { SECTIONS } from './sections';
import { cn } from '../Utils/cn';

export default function BottomTabs() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 flex h-(--tabbar-h) border-t-4 border-pw-sun bg-pw-deep pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {SECTIONS.map((s) => {
        const active = s.isActive(pathname);
        return (
          <Link
            key={s.id}
            to={s.to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
              active ? 'text-pw-sun' : 'text-white/70'
            )}
          >
            <s.icon className="size-5" />
            {s.label}
          </Link>
        );
      })}
      <MoreMenu
        placement="above"
        className="flex flex-1"
        buttonClassName={({ highlighted }) =>
          cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
            highlighted ? 'text-pw-sun' : 'text-white/70'
          )
        }
      >
        <MoreIcon className="size-5" />
        More
      </MoreMenu>
    </nav>
  );
}
