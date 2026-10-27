import { Link, useParams } from 'react-router';
import PalImage from '../Components/PalImage';
import WorkLevel from '../Components/WorkLevel';
import { Breadcrumb, Page, PageHeader, Panel } from '../Components/ui';
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
          title="Work suitability"
          subtitle="What each Pal can do at your base. Higher levels work faster."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WORK_TYPES.map((w) => (
            <Link
              key={w}
              to={`/work/${workId(w)}`}
              className="rounded-2xl border bg-pw-paper p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <h2 className="text-2xl">{w}</h2>
              <p className="text-sm text-pw-muted">{workDescriptions[w]}</p>
              <p className="mt-2 text-sm font-semibold text-pw-teal-dark">
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
      <Breadcrumb to="/work" label="Work suitability" />
      <PageHeader title={work} subtitle={workDescriptions[work]} />
      <Panel title={`${list.length} Pals, best first`}>
        <ul className="divide-y">
          {list.map((p) => (
            <li key={p.id}>
              <Link
                to={`/pal/${p.id}`}
                className="flex items-center gap-3 py-2 hover:bg-pw-cream/60"
              >
                <PalImage pal={p} className="size-10" />
                <span className="flex-1 font-display text-xl font-bold">
                  {p.name}
                </span>
                <span className="text-sm text-pw-muted">#{p.number}</span>
                <WorkLevel level={p.work[work] ?? 0} />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </Page>
  );
}
