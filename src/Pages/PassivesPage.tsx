import React from 'react';
import { useLocation } from 'react-router';
import { Page, PageHeader, SearchInput } from '../Components/ui';
import { pals, passiveSkills } from '../data';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { useQueryState } from '../Hooks/useQueryState';
import { normalise } from '../Utils/text';
import { cn } from '../Utils/cn';

const tone = (rank: number | null) =>
  !rank
    ? 'bg-pw-line text-pw-ink'
    : rank > 0
      ? 'bg-amber-100 text-amber-800'
      : 'bg-red-100 text-red-700';

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
        title="Passive skills"
        subtitle="Traits Pals can carry. Positive ranks help; negative ranks are drawbacks."
      />
      <div className="mb-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search passives"
        />
      </div>
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
              {innate.length > 0 && (
                <p className="mt-2 text-sm">
                  <span className="font-semibold">Innate to:</span>{' '}
                  {innate.map((p) => p.name).join(', ')}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </Page>
  );
}
