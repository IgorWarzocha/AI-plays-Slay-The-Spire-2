import type { EntityKind } from '../types.ts';

// The runtime save format uses ids like CARD.BASH while the bootstrap data uses
// BASH. We normalize onto the bootstrap shape and keep the full game id too.
export function toCanonicalId(rawId: unknown): string {
  if (!rawId) {
    return '';
  }

  const trimmed = String(rawId).trim().toUpperCase();
  const dotIndex = trimmed.indexOf('.');
  return dotIndex === -1 ? trimmed : trimmed.slice(dotIndex + 1);
}

export function toGameId(kind: EntityKind, canonicalId: string): string {
  const prefixByKind: Record<EntityKind, string> = {
    card: 'CARD',
    relic: 'RELIC',
    event: 'EVENT',
  };
  const prefix = prefixByKind[kind];

  return `${prefix}.${canonicalId}`;
}

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_.\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildAliases(kind: EntityKind, canonicalId: string, name: string): string[] {
  return [
    canonicalId,
    toGameId(kind, canonicalId),
    normalizeText(canonicalId),
    normalizeText(toGameId(kind, canonicalId)),
    normalizeText(name),
  ].filter(Boolean);
}
