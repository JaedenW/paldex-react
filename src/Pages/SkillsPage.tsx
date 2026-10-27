import React from 'react';
import { Link } from 'react-router';
import ElementBadge from '../Components/ElementBadge';
import InfiniteSentinel from '../Components/InfiniteSentinel';
import { useInfiniteScroll } from '../Hooks/useInfiniteScroll';
import { elementColours } from '../Utils/elements';
import { cn } from '../Utils/cn';
import {
  Chip,
  EmptyState,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Toolbar,
  ChipRow,
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
  const { limit, hasMore, sentinelRef, showAll } = useInfiniteScroll(
    list.length,
    60,
    [query, element, sort, fruit].join('|')
  );

  return (
    <Page>
      <PageHeader
        eyebrow="Pals"
        title="Active skills"
        subtitle={`${activeSkills.length} attacks. Skill fruits can teach many of them to any Pal.`}
      />
      <Toolbar stickyOnPhones={false}>
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
        <span
          className="ml-auto hidden text-sm text-pw-muted sm:inline"
          aria-live="polite"
        >
          {list.length} skill{list.length === 1 ? '' : 's'}
        </span>
        <ChipRow label="Elements">
          {ELEMENTS.map((e: Element) => (
            <button
              key={e}
              type="button"
              aria-pressed={element === e}
              onClick={() => setElement(element === e ? '' : e)}
              className={cn(
                'shrink-0 rounded-full transition',
                element && element !== e && 'opacity-40 hover:opacity-80'
              )}
            >
              <ElementBadge element={e} linked={false} />
            </button>
          ))}
        </ChipRow>
      </Toolbar>
      {list.length === 0 ? (
        <EmptyState title="No skills match">Try removing a filter.</EmptyState>
      ) : (
        <>
          <ul className="grid-fluid [--min:17rem]">
            {list.slice(0, limit).map((s) => (
              <li key={s.id}>
                <Link
                  to={`/skill/${s.id}`}
                  className="relative flex h-full card-link flex-col gap-2 overflow-hidden card p-4 pt-5"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ backgroundColor: elementColours[s.element] }}
                  />
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-display text-xl leading-tight font-bold">
                      {s.name}
                    </span>
                    <ElementBadge
                      element={s.element}
                      linked={false}
                      size="sm"
                    />
                  </span>
                  <span className="line-clamp-3 flex-1 text-sm text-pw-muted">
                    {s.description}
                  </span>
                  <span className="flex flex-wrap gap-1.5 text-xs font-semibold">
                    <span className="rounded-full bg-pw-cream px-2.5 py-1">
                      Power {s.power ?? '–'}
                    </span>
                    <span className="rounded-full bg-pw-cream px-2.5 py-1">
                      {s.cooldown ?? '–'}s cooldown
                    </span>
                    {s.fruit && (
                      <span className="rounded-full bg-pw-sun/20 px-2.5 py-1">
                        Skill fruit
                      </span>
                    )}
                    {s.boss && (
                      <span className="rounded-full bg-pw-sun/20 px-2.5 py-1">
                        Boss
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <InfiniteSentinel
            sentinelRef={sentinelRef}
            hasMore={hasMore}
            showAll={showAll}
          />
        </>
      )}
    </Page>
  );
}
