import { Link } from 'react-router';
import { SearchIcon } from '../Components/Icons';
import { GROUPS } from '../Components/sections';
import { Page, PageHeader } from '../Components/ui';
import {
  activeSkills,
  dataSource,
  gearCounts,
  pals,
  passiveSkills,
} from '../data';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { useSearch } from '../Utils/SearchContext';

// how many things each section holds, shown beside its name
const counts: Record<string, number> = {
  paldex: pals.length,
  skills: activeSkills.length,
  passives: passiveSkills.length,
  items: gearCounts.items,
  buildings: gearCounts.buildings,
  technology: gearCounts.tech,
  crafting: gearCounts.recipes,
};

/** The front page: search, and every section in one place */
export default function HomePage() {
  useDocumentTitle();
  const { openSearch } = useSearch();

  return (
    <Page>
      <PageHeader
        title="Paldex"
        subtitle={`A reference for Palworld${dataSource.gameVersion ? ` ${dataSource.gameVersion}` : ''}, from the community wiki (retrieved ${dataSource.scrapedAt}).`}
      />

      <button
        type="button"
        onClick={openSearch}
        className="mb-8 flex h-12 w-full max-w-2xl items-center gap-3 card px-4 text-left text-pw-muted transition hover:border-pw-teal"
      >
        <SearchIcon className="size-5 shrink-0" />
        <span className="flex-1">Search Pals, items, buildings, skills…</span>
        <kbd className="hidden rounded-md border px-2 py-0.5 text-sm sm:inline">
          /
        </kbd>
      </button>

      {GROUPS.map((group) => (
        <section
          key={group.id}
          className="mb-8"
          aria-labelledby={`home-${group.id}`}
        >
          <h2
            id={`home-${group.id}`}
            className="mb-3 flex items-center gap-2 text-2xl text-pw-heading"
          >
            <span aria-hidden="true" className="size-2.5 rotate-45 bg-pw-sun" />
            {group.label}
          </h2>
          <ul className="grid-fluid [--min:17rem]">
            {group.sections.map((s) => (
              <li key={s.id}>
                <Link
                  to={s.to}
                  className="flex h-full card-link items-start gap-3 card p-3.5"
                >
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: s.accent }}
                  >
                    <s.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-display text-xl leading-tight font-bold">
                        {s.label}
                      </span>
                      {counts[s.id] !== undefined && (
                        <span className="text-xs font-semibold text-pw-muted">
                          {counts[s.id].toLocaleString()}
                        </span>
                      )}
                    </span>
                    <span className="block text-sm text-pw-muted">
                      {s.description}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Page>
  );
}
