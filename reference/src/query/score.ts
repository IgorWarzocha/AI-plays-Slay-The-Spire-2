import type { BaseEntity } from '../types.ts';
import { normalizeText, toCanonicalId, toGameId } from '../model/ids.ts';

function scoreAliases(entity: BaseEntity, query: string): number {
  let score = 0;

  for (const alias of entity.aliases ?? []) {
    const normalizedAlias = normalizeText(alias);
    if (normalizedAlias === query) {
      score = Math.max(score, 950);
    } else if (normalizedAlias.startsWith(query)) {
      score = Math.max(score, 760);
    } else if (normalizedAlias.includes(query)) {
      score = Math.max(score, 680);
    }
  }

  return score;
}

export function scoreEntity(entity: BaseEntity, rawQuery: string): number {
  const query = normalizeText(rawQuery);
  const exactCanonical = toCanonicalId(rawQuery);
  const exactGameId = toGameId(entity.kind, exactCanonical);

  if (entity.id === exactCanonical) {
    return 1200;
  }

  if (entity.gameId === rawQuery.toUpperCase() || entity.gameId === exactGameId) {
    return 1180;
  }

  if (normalizeText(entity.name) === query) {
    return 1100;
  }

  let score = scoreAliases(entity, query);

  const description = normalizeText(entity.description);
  if (description.includes(query)) {
    score = Math.max(score, 400);
  }

  return score;
}
