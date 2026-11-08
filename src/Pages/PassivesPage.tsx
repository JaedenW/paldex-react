import React from 'react';
import { Link } from 'react-router';
import {
  EmptyState,
  Page,
  PageHeader,
  SearchInput,
  Toolbar,
} from '../Components/ui';
import { pals, passiveSkills } from '../data';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { useHashTarget } from '../Hooks/useHashTarget';
import { useQueryState } from '../Hooks/useQueryState';
import { normalise } from '../Utils/text';
import type { Pal } from '../types';
import { cn } from '../Utils/cn';
import { rankTone, TONES } from '../Utils/tones';

// the card's top edge, matching the rank pill
const EDGE = { good: 'bg-pw-sun', bad: 'bg-red-500', plain: 'bg-pw-line' };

export default function PassivesPage() {
  useDocumentTitle('Passive skills');
  const [query, setQuery] = useQueryState('q');
  const hash = useHashTarget();
  const q = normalise(query.trim());
  const list = passiveSkills.filter(
    (s) =>
      !q ||
      normalise(s.name).includes(q) ||
      normalise(s.description).includes(q)
  );

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
        <span
          className="ml-auto hidden text-sm text-pw-muted sm:inline"
          aria-live="polite"
        >
          {list.length} passive{list.length === 1 ? '' : 's'}
        </span>
      </Toolbar>
      {list.length === 0 ? (
        <EmptyState title="No passives match">Try another search.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((s) => {
            const innate = pals.filter((p) => p.passiveSkills.includes(s.name));
            const tone = rankTone(s.rank);
            return (
              <article
                key={s.id}
                id={s.id}
                className={cn(
                  'relative scroll-mt-32 overflow-hidden card p-4 pt-5 lg:scroll-mt-20',
                  hash === `#${s.id}` && 'ring-2 ring-pw-teal'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('absolute inset-x-0 top-0 h-1', EDGE[tone])}
                />
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl leading-tight">{s.name}</h2>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1',
                      TONES[tone]
                    )}
                  >
                    Rank {s.rank ?? '–'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-pw-muted">{s.description}</p>
                {innate.length > 0 && <InnateTo pals={innate} />}
              </article>
            );
          })}
        </div>
      )}
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
