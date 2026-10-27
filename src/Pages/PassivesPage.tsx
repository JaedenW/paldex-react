import React from 'react';
import { Link, useLocation } from 'react-router';
import { Page, PageHeader, SearchInput, Toolbar } from '../Components/ui';
import { pals, passiveSkills } from '../data';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { useQueryState } from '../Hooks/useQueryState';
import { normalise } from '../Utils/text';
import type { Pal } from '../types';
import { cn } from '../Utils/cn';

const tone = (rank: number | null) =>
  !rank
    ? 'bg-pw-line text-pw-ink'
    : rank > 0
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200'
      : 'bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-200';

export default function PassivesPage() {
  useDocumentTitle('Passive skills');
  const [query, setQuery] = useQueryState('q');
  const { hash } = useLocation();
  const q = normalise(query.trim());
  const list = passiveSkills.filter(
    (s) =>
      !q ||
      normalise(s.name).includes(q) ||
      normalise(s.description).includes(q)
  );

  React.useEffect(() => {
    if (hash)
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ block: 'center' });
  }, [hash]);

  return (
    <Page>
      <PageHeader
        eyebrow="Pals"
        title="Passive skills"
        subtitle="Traits Pals can carry. Positive ranks help; negative ranks are drawbacks."
      />
      <Toolbar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search passives"
        />
        <span className="ml-auto hidden text-sm text-pw-muted sm:inline">
          {list.length} passive{list.length === 1 ? '' : 's'}
        </span>
      </Toolbar>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((s) => {
          const innate = pals.filter((p) => p.passiveSkills.includes(s.name));
          return (
            <article
              key={s.id}
              id={s.id}
              className={cn(
                'scroll-mt-4 rounded-2xl border bg-pw-paper p-4 shadow-card',
                hash === `#${s.id}` && 'ring-2 ring-pw-teal'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl">{s.name}</h2>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    tone(s.rank)
                  )}
                >
                  Rank {s.rank ?? '–'}
                </span>
              </div>
              <p className="mt-1 text-pw-muted">{s.description}</p>
              {innate.length > 0 && <InnateTo pals={innate} />}
            </article>
          );
        })}
      </div>
    </Page>
  );
}

const INNATE_SHOWN = 6;

/** The Pals that always have a passive, linked, with the rest behind a button */
function InnateTo({ pals }: { pals: Pal[] }) {
  const [all, setAll] = React.useState(false);
  const shown = all ? pals : pals.slice(0, INNATE_SHOWN);
  return (
    <p className="mt-2 text-sm">
      <span className="font-semibold">Always on: </span>
      {shown.map((p, i) => (
        <React.Fragment key={p.id}>
          {i > 0 && ', '}
          <Link to={`/pal/${p.id}`} className="text-pw-link hover:underline">
            {p.name}
          </Link>
        </React.Fragment>
      ))}
      {pals.length > INNATE_SHOWN && (
        <>
          {' '}
          <button
            type="button"
            onClick={() => setAll(!all)}
            className="font-semibold text-pw-link hover:underline"
          >
            {all ? 'show fewer' : `and ${pals.length - INNATE_SHOWN} more`}
          </button>
        </>
      )}
    </p>
  );
}
