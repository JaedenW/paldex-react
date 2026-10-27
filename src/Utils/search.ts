import { activeSkills, pals, passiveSkills } from '../data';
import { normalise } from './text';

export interface SearchResult {
  kind: 'Pal' | 'Skill' | 'Passive' | 'Element' | 'Work';
  label: string;
  detail?: string;
  to: string;
  icon?: string;
}

/** Rank how well a name matches: prefix beats word start beats substring */
export function matchScore(name: string, query: string): number {
  const n = normalise(name),
    q = normalise(query.trim());
  if (!q) return 0;
  if (n === q) return 4;
  if (n.startsWith(q)) return 3;
  if (n.split(/[\s-]+/).some((w) => w.startsWith(q))) return 2;
  return n.includes(q) ? 1 : 0;
}

export function search(query: string, limit = 12): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const scored: { score: number; result: SearchResult }[] = [];
  const push = (name: string, result: SearchResult, bonus = 0) => {
    const score = matchScore(name, q);
    if (score) scored.push({ score: score * 10 + bonus, result });
  };
  for (const p of pals) {
    const result: SearchResult = {
      kind: 'Pal',
      label: p.name,
      detail: `#${p.number}`,
      to: `/pal/${p.id}`,
      icon: `/pals/${p.id}.png`,
    };
    if (q.replace(/^#/, '') === p.number) scored.push({ score: 100, result });
    else push(p.name, result, 5);
  }
  for (const s of activeSkills) {
    push(s.name, {
      kind: 'Skill',
      label: s.name,
      detail: s.element,
      to: `/skill/${s.id}`,
    });
  }
  for (const s of passiveSkills) {
    push(s.name, { kind: 'Passive', label: s.name, to: `/passives#${s.id}` });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.result);
}
