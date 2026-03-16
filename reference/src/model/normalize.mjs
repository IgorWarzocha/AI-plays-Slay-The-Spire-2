import { buildAliases, toCanonicalId, toGameId } from "./ids.mjs";

function buildBaseEntity(kind, raw, source, state) {
  const canonicalId = toCanonicalId(raw.id);
  return {
    kind,
    id: canonicalId,
    gameId: toGameId(kind, canonicalId),
    name: raw.name ?? canonicalId,
    description: raw.description ?? null,
    descriptionRaw: raw.description_raw ?? null,
    imageUrl: raw.image_url ?? null,
    source,
    aliases: buildAliases(kind, canonicalId, raw.name ?? canonicalId),
    state,
  };
}

export function normalizeCard(raw, source, state) {
  return {
    ...buildBaseEntity("card", raw, source, state),
    cost: raw.cost ?? null,
    type: raw.type ?? null,
    rarity: raw.rarity ?? null,
    color: raw.color ?? null,
    target: raw.target ?? null,
    keywords: raw.keywords ?? [],
    tags: raw.tags ?? [],
    upgrade: raw.upgrade ?? null,
  };
}

export function normalizeRelic(raw, source, state) {
  return {
    ...buildBaseEntity("relic", raw, source, state),
    rarity: raw.rarity ?? null,
    pool: raw.pool ?? null,
    flavor: raw.flavor ?? null,
  };
}

export function normalizeEvent(raw, source, state) {
  return {
    ...buildBaseEntity("event", raw, source, state),
    type: raw.type ?? null,
    act: raw.act ?? null,
    epithet: raw.epithet ?? null,
    options: raw.options ?? null,
    pages: raw.pages ?? null,
    relics: raw.relics ?? [],
  };
}
