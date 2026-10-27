import React from 'react';
import { Link } from 'react-router';
import ElementBadge from '../Components/ElementBadge';
import {
  Chip,
  EmptyState,
  Page,
  PageHeader,
  SearchInput,
  Select,
} from '../Components/ui';
import { activeSkills } from '../data';
import { useQueryState } from '../Hooks/useQueryState';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import { ELEMENTS } from '../Utils/elements';
import { normalise } from '../Utils/text';
import type { ActiveSkill, Element } from '../types';

const SORTS = {
  name: (a: ActiveSkill, b: ActiveSkill) => a.name.localeCompare(b.name),
  power: (a: ActiveSkill, b: ActiveSkill) => (b.power ?? 0) - (a.power ?? 0),
  cooldown: (a: ActiveSkill, b: ActiveSkill) =>
    (a.cooldown ?? 0) - (b.cooldown ?? 0),
};

export default function SkillsPage() {
  useDocumentTitle('Active skills');
  const [query, setQuery] = useQueryState('q');
  const [element, setElement] = useQueryState('el');
  const [sort, setSort] = useQueryState('sort', 'name');
  const [fruit, setFruit] = useQueryState('fruit');

  const list = React.useMemo(() => {
    const q = normalise(query.trim());
    return activeSkills
      .filter((s) => !q || normalise(s.name).includes(q))
      .filter((s) => !element || s.element === element)
      .filter((s) => !fruit || s.fruit)
      .sort(SORTS[sort as keyof typeof SORTS] ?? SORTS.name);
  }, [query, element, sort, fruit]);

  return (
    <Page>
      <PageHeader
        title="Active skills"
        subtitle={`${activeSkills.length} attacks. Skill fruits can teach many of them to any Pal.`}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search skills"
        />
        <Select
          label="Sort by"
          value={sort as keyof typeof SORTS}
          onChange={setSort}
          options={[
            { value: 'name', label: 'Sort: Name' },
            { value: 'power', label: 'Sort: Power' },
            { value: 'cooldown', label: 'Sort: Cooldown' },
          ]}
        />
        <Chip active={!!fruit} onClick={() => setFruit(fruit ? '' : '1')}>
          Skill fruit
        </Chip>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ELEMENTS.map((e: Element) => (
          <button
            key={e}
            type="button"
            aria-pressed={element === e}
            onClick={() => setElement(element === e ? '' : e)}
            className={
              element && element !== e ? 'opacity-40 hover:opacity-80' : ''
            }
          >
            <ElementBadge element={e} linked={false} />
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState title="No skills match" />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-pw-paper shadow-card">
          <ul className="divide-y">
            {list.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/skill/${s.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-pw-cream/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl font-bold">{s.name}</p>
                    <p className="truncate text-sm text-pw-muted">
                      {s.description}
                    </p>
                  </div>
                  <div className="hidden w-24 text-sm sm:block">
                    <span className="text-pw-muted">Power</span>{' '}
                    <b>{s.power ?? '–'}</b>
                  </div>
                  <div className="hidden w-24 text-sm sm:block">
                    <span className="text-pw-muted">CT</span>{' '}
                    <b>{s.cooldown ?? '–'}s</b>
                  </div>
                  <ElementBadge element={s.element} linked={false} size="sm" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Page>
  );
}
