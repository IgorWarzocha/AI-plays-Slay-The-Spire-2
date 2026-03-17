import type { ReferenceLibrary, SearchOptions, SearchResult } from '../types.ts';
import { scoreEntity } from './score.ts';

export function searchLibrary(library: ReferenceLibrary, query: string, options: SearchOptions = {}): SearchResult[] {
  const kind = options.kind ?? 'all';
  const limit = Number(options.limit ?? 5);
  const exact = Boolean(options.exact);

  const pool = [
    ...(kind === 'all' || kind === 'card' ? library.cards : []),
    ...(kind === 'all' || kind === 'relic' ? library.relics : []),
    ...(kind === 'all' || kind === 'event' ? library.events : []),
  ];

  const scored = pool
    .map((entity) => ({ entity, score: scoreEntity(entity, query) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entity.name.localeCompare(right.entity.name));

  const filtered = exact ? scored.filter((item) => item.score >= 950) : scored;
  return filtered.slice(0, limit);
}
