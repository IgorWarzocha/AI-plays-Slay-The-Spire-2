// The runtime save format uses ids like CARD.BASH while the bootstrap data uses
// BASH. We normalize onto the bootstrap shape and keep the full game id too.
export function toCanonicalId(rawId) {
  if (!rawId) {
    return "";
  }

  const trimmed = String(rawId).trim().toUpperCase();
  const dotIndex = trimmed.indexOf(".");
  return dotIndex === -1 ? trimmed : trimmed.slice(dotIndex + 1);
}

export function toGameId(kind, canonicalId) {
  const prefix = {
    card: "CARD",
    relic: "RELIC",
    event: "EVENT",
  }[kind];

  if (!prefix) {
    throw new Error(`Unsupported kind '${kind}'.`);
  }

  return `${prefix}.${canonicalId}`;
}

export function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildAliases(kind, canonicalId, name) {
  return [
    canonicalId,
    toGameId(kind, canonicalId),
    normalizeText(canonicalId),
    normalizeText(toGameId(kind, canonicalId)),
    normalizeText(name),
  ].filter(Boolean);
}
