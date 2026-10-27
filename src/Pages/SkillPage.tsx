import { Link, useParams } from 'react-router';
import ElementBadge from '../Components/ElementBadge';
import LongList from '../Components/LongList';
import PalCard from '../Components/PalCard';
import { Breadcrumbs, Page, PageHeader, Panel } from '../Components/ui';
import { pals, skillById } from '../data';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import NotFoundPage from './NotFoundPage';

export default function SkillPage() {
  const { id } = useParams();
  const skill = skillById.get(id ?? '');
  useDocumentTitle(skill?.name);
  if (!skill) return <NotFoundPage />;

  const learners = pals
    .map((p) => ({
      pal: p,
      level: p.activeSkills.find((s) => s.name === skill.name)?.level,
    }))
    .filter(
      (x): x is { pal: (typeof pals)[number]; level: number } => x.level != null
    )
    .sort((a, b) => a.level - b.level);

  return (
    <Page>
      <Breadcrumbs
        items={[{ label: 'Skills', to: '/skills' }, { label: skill.name }]}
      />
      <PageHeader title={skill.name} subtitle={skill.description}>
        <ElementBadge element={skill.element} size="lg" />
      </PageHeader>
      <Panel className="mb-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            ['Power', skill.power ?? '–'],
            ['Cooldown', skill.cooldown != null ? `${skill.cooldown}s` : '–'],
            ['Skill fruit', skill.fruit ? 'Yes' : 'No'],
            ['Boss skill', skill.boss ? 'Yes' : 'No'],
            ['Inheritable', skill.inheritable ? 'Yes' : 'No'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold tracking-wide text-pw-muted uppercase">
                {label}
              </dt>
              <dd className="font-display text-2xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel title={`Learned by ${learners.length} Pals`}>
        {learners.length === 0 ? (
          <p className="text-pw-muted">
            No Pal learns this by levelling.{' '}
            <Link
              to="/skills"
              className="font-semibold text-pw-link hover:underline"
            >
              Back to skills
            </Link>
          </p>
        ) : (
          <LongList
            items={learners}
            itemKey={(l) => l.pal.id}
            text={(l) => l.pal.name}
            noun="Pals"
            min="9.5rem"
            first={24}
            step={48}
            renderItem={({ pal, level }) => (
              <div className="relative h-full [&>a]:h-full">
                <PalCard pal={pal} />
                <span className="absolute top-2 right-2 rounded-full bg-pw-deep px-2 py-0.5 text-xs font-semibold text-white">
                  Lv. {level}
                </span>
              </div>
            )}
          />
        )}
      </Panel>
    </Page>
  );
}
