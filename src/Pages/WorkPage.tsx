import { Link, useParams } from 'react-router';
import LongList from '../Components/LongList';
import PalImage from '../Components/PalImage';
import WorkLevel from '../Components/WorkLevel';
import { Breadcrumbs, Page, PageHeader } from '../Components/ui';
import { cn } from '../Utils/cn';
import { pals } from '../data';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import {
  WORK_TYPES,
  palsByWork,
  workDescriptions,
  workFromId,
  workId,
} from '../Utils/work';
import NotFoundPage from './NotFoundPage';

export default function WorkPage() {
  const { type } = useParams();
  const work = workFromId(type);
  useDocumentTitle(work ?? 'Work suitability');

  if (type && !work) return <NotFoundPage />;
  if (!work) {
    return (
      <Page>
        <PageHeader
          eyebrow="Pals"
          title="Work suitability"
          subtitle="What each Pal can do at your base. Higher levels work faster."
        />
        <div className="grid-fluid [--min:16rem]">
          {WORK_TYPES.map((w) => (
            <Link
              key={w}
              to={`/work/${workId(w)}`}
              className="flex card-link flex-col gap-1 card p-4"
            >
              <h2 className="text-2xl">{w}</h2>
              <p className="flex-1 text-sm text-pw-muted">
                {workDescriptions[w]}
              </p>
              <p className="mt-2 text-sm font-semibold text-pw-link">
                {pals.filter((p) => p.work[w]).length} Pals
              </p>
            </Link>
          ))}
        </div>
      </Page>
    );
  }

  const list = palsByWork(pals, work);
  return (
    <Page>
      <Breadcrumbs items={[{ label: 'Work', to: '/work' }, { label: work }]} />
      <PageHeader
        eyebrow="Work suitability"
        title={work}
        subtitle={`${workDescriptions[work]}. ${list.length} Pals, best first.`}
      />
      <LongList
        items={list.map((p, i) => ({ p, rank: i + 1 }))}
        itemKey={({ p }) => p.id}
        text={({ p }) => p.name}
        noun="Pals"
        min="13.5rem"
        first={36}
        step={72}
        renderItem={({ p, rank }) => (
          <Link
            to={`/pal/${p.id}`}
            className="relative flex h-full card-link items-center gap-3 card p-3"
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-2 left-2 flex size-6 items-center justify-center rounded-full font-display text-sm font-bold',
                rank <= 3
                  ? 'bg-pw-sun text-pw-deep'
                  : 'bg-pw-cream text-pw-muted'
              )}
            >
              {rank}
            </span>
            <PalImage pal={p} className="mt-2 ml-2 size-14 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-lg leading-tight font-bold">
                {p.name}
              </span>
              <span className="mb-1 block text-xs text-pw-muted">
                #{p.number}
              </span>
              <WorkLevel level={p.work[work] ?? 0} />
            </span>
          </Link>
        )}
      />
    </Page>
  );
}
