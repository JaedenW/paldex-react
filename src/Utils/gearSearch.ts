import { buildingIcon, buildings, itemIcon, items, techs } from '../data/gear';
import { matchScore, type Scored } from './search';

/**
 * Items, buildings and technologies for the search palette. Kept apart from
 * search.ts so the item data is only loaded once the palette is opened.
 */
export function searchGear(query: string): Scored[] {
  const q = query.trim();
  if (!q) return [];
  const scored: Scored[] = [];
  const push = (name: string, score: number, result: Scored['result']) => {
    const s = matchScore(name, q);
    if (s) scored.push({ score: s * 10 + score, result });
  };
  for (const i of items) {
    // upgrade schematics would swamp results; they still match when searched for by name
    push(i.name, i.type === 'Schematic' ? -4 : 0, {
      kind: 'Item',
      label: i.name,
      detail: i.subtype ?? i.type,
      to: `/item/${i.id}`,
      icon: i.type === 'Schematic' ? undefined : itemIcon(i),
    });
  }
  for (const b of buildings) {
    push(b.name, 0, {
      kind: 'Building',
      label: b.name,
      detail: b.subtype ?? b.type,
      to: `/building/${b.id}`,
      icon: buildingIcon(b),
    });
  }
  for (const t of techs) {
    push(t.name, -2, {
      kind: 'Tech',
      label: t.name,
      detail: `Lv. ${t.level}`,
      to: `/technology#${t.id}`,
    });
  }
  return scored;
}
