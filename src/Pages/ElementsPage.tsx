import React from 'react';
import { useLocation } from 'react-router';
import ElementBadge from '../Components/ElementBadge';
import PalCard from '../Components/PalCard';
import { Chip, Page, PageHeader, Panel } from '../Components/ui';
import { pals } from '../data';
import { useDocumentTitle } from '../Hooks/useDocumentTitle';
import {
  ELEMENTS,
  STRONG_AGAINST,
  defenceChart,
  elementColours,
  formatMultiplier,
  multiplier,
} from '../Utils/elements';
import type { Element } from '../types';
import { cn } from '../Utils/cn';

export default function ElementsPage() {
  useDocumentTitle('Elements');
  const { hash } = useLocation();
  const [a, setA] = React.useState<Element>('Fire');
  const [b, setB] = React.useState<Element | ''>('');
  const defenders = b && b !== a ? [a, b] : [a];
  const defence = defenceChart(defenders);
  const matching = pals.filter((p) =>
    defenders.every((e) => p.elements.includes(e))
  );

  // #fire scrolls to that element's card
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
        title="Elements"
        subtitle="Every attack deals double damage to what it’s strong against and half to what resists it. A Pal’s two elements multiply."
      />

      <Panel title="Type chart" className="mb-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-separate border-spacing-1 text-center">
            <caption className="sr-only">
              Damage multiplier of each attacking element (rows) against each
              defending element (columns)
            </caption>
            <thead>
              <tr>
                <th className="text-xs font-semibold text-pw-muted">
                  ATK ↓ / DEF →
                </th>
                {ELEMENTS.map((e) => (
                  <th key={e} scope="col" className="p-0.5">
                    <ElementBadge
                      element={e}
                      size="sm"
                      linked={false}
                      className="w-full justify-center"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ELEMENTS.map((atk) => (
                <tr key={atk}>
                  <th scope="row" className="p-0.5">
                    <ElementBadge
                      element={atk}
                      size="sm"
                      linked={false}
                      className="w-full justify-center"
                    />
                  </th>
                  {ELEMENTS.map((def) => {
                    const m = multiplier(atk, [def]);
                    return (
                      <td
                        key={def}
                        className={cn(
                          'rounded-md py-1.5 font-display text-lg font-bold',
                          m > 1 &&
                            'bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-200',
                          m < 1 &&
                            'bg-teal-100 text-teal-800 dark:bg-teal-400/20 dark:text-teal-200',
                          m === 1 && 'text-pw-line'
                        )}
                      >
                        {m === 1 ? '·' : formatMultiplier(m)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Defence calculator" className="mb-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-pw-muted uppercase">
              First element
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ELEMENTS.map((e) => (
                <Chip key={e} active={a === e} onClick={() => setA(e)}>
                  {e}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-pw-muted uppercase">
              Second element (optional)
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={!b} onClick={() => setB('')}>
                None
              </Chip>
              {ELEMENTS.filter((e) => e !== a).map((e) => (
                <Chip key={e} active={b === e} onClick={() => setB(e)}>
                  {e}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {ELEMENTS.map((e) => (
            <li
              key={e}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-pw-cream/70 p-2"
            >
              <ElementBadge element={e} size="sm" linked={false} />
              <span
                className={cn(
                  'font-display text-xl font-bold',
                  defence[e] > 1 && 'text-red-600 dark:text-red-300',
                  defence[e] < 1 && 'text-pw-link'
                )}
              >
                {formatMultiplier(defence[e])}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 mb-2 text-sm text-pw-muted">
          {matching.length} Pal{matching.length === 1 ? '' : 's'} with{' '}
          {defenders.join(' / ')}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {matching.slice(0, 12).map((p) => (
            <PalCard key={p.id} pal={p} />
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ELEMENTS.map((e) => {
          const count = pals.filter((p) => p.elements.includes(e)).length;
          return (
            <section
              key={e}
              id={e.toLowerCase()}
              className="scroll-mt-4 rounded-2xl border-l-8 bg-pw-paper p-4 shadow-card"
              style={{ borderLeftColor: elementColours[e] }}
            >
              <h2 className="text-2xl">{e}</h2>
              <p className="mt-1 text-sm text-pw-muted">
                Strong against:{' '}
                {STRONG_AGAINST[e].length
                  ? STRONG_AGAINST[e].join(', ')
                  : 'nothing'}
              </p>
              <p className="text-sm text-pw-muted">
                Weak to:{' '}
                {ELEMENTS.filter((x) => STRONG_AGAINST[x].includes(e)).join(
                  ', '
                ) || 'nothing'}
              </p>
              <a
                href={`/paldex?el=${e}`}
                className="mt-2 inline-block text-sm font-semibold text-pw-link hover:underline"
              >
                {count} Pals →
              </a>
            </section>
          );
        })}
      </div>
    </Page>
  );
}
