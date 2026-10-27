export interface Segment {
  text: string;
  /** Where the text links to, when it names something we have a page for */
  to?: string;
}

/**
 * Finds names of Pals, buildings and items inside a sentence so they can be
 * linked. Longer names win ("Lamball Mutton" before "Lamball"), names must be
 * whole words and match case, and `self` is never linked.
 */
export function createLinker(entries: { name: string; to: string }[]) {
  // the first entry for a name wins, so list the kinds in priority order
  const byName = new Map<string, string>();
  for (const e of entries)
    if (e.name.length >= 3 && !byName.has(e.name)) byName.set(e.name, e.to);

  const escaped = [...byName.keys()]
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = escaped.length
    ? new RegExp(
        `(?<![\\p{L}\\p{N}])(${escaped.join('|')})(?![\\p{L}\\p{N}])`,
        'gu'
      )
    : undefined;

  return function link(text: string, self?: string): Segment[] {
    if (!pattern) return [{ text }];
    const out: Segment[] = [];
    let last = 0;
    for (const m of text.matchAll(pattern)) {
      const name = m[1];
      const index = m.index ?? 0;
      if (name === self) continue;
      if (index > last) out.push({ text: text.slice(last, index) });
      out.push({ text: name, to: byName.get(name) });
      last = index + name.length;
    }
    if (last < text.length) out.push({ text: text.slice(last) });
    return out.length ? out : [{ text }];
  };
}
