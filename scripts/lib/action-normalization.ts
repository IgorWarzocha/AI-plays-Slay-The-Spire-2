import type { DisplayState } from './types.ts';

function normalizeMerchantEntryId(entryId: string): string {
  return entryId.replace(/^([a-z]+)-\d{2}-/i, '$1-');
}

function stripPotionSlotPrefix(potionId: string): string {
  return potionId.replace(/^potion-\d+:/i, '');
}

interface ParsedPotionAction {
  prefix: string;
  potionId: string;
  target: string;
}

function parsePotionAction(action: string): ParsedPotionAction | null {
  const prefixes = [
    'combat.use_potion:',
    'combat.discard_potion:',
    'potions.use:',
    'potions.discard:',
  ] as const;

  const prefix = prefixes.find((candidate) => action.startsWith(candidate));
  if (!prefix) {
    return null;
  }

  const remainder = action.slice(prefix.length);
  const [potionId = '', target = ''] = remainder.split('@', 2);
  return { prefix, potionId, target };
}

function normalizePotionActionForCurrentState(action: string, state: DisplayState | null | undefined): string {
  const parsed = parsePotionAction(action);
  if (!parsed) {
    return action;
  }

  const availableActions = Array.isArray(state?.actions) ? state.actions : [];
  if (availableActions.includes(action)) {
    return action;
  }

  const targetPotion = stripPotionSlotPrefix(parsed.potionId);
  const matches = availableActions
    .filter((candidate) => candidate.startsWith(parsed.prefix))
    .filter((candidate) => {
      const candidateParsed = parsePotionAction(candidate);
      if (!candidateParsed) {
        return false;
      }

      if (stripPotionSlotPrefix(candidateParsed.potionId) !== targetPotion) {
        return false;
      }

      if (parsed.target && candidateParsed.target !== parsed.target) {
        return false;
      }

      return true;
    });

  return matches.length === 1 ? (matches[0] ?? action) : action;
}

export function normalizeActionForCurrentState(action: string, state: DisplayState | null | undefined): string {
  // The exporter can renumber merchant slots and potion slots after a state
  // change. Re-resolving against the latest surfaced actions keeps callers
  // stable without forcing every CLI surface to understand those shifts.
  if (action.startsWith('merchant.buy:')) {
    const availableActions = Array.isArray(state?.actions) ? state.actions : [];
    if (availableActions.includes(action)) {
      return action;
    }

    const targetId = action.slice('merchant.buy:'.length);
    const normalizedTarget = normalizeMerchantEntryId(targetId);
    const matches = availableActions
      .filter((candidate) => candidate.startsWith('merchant.buy:'))
      .filter((candidate) =>
        normalizeMerchantEntryId(candidate.slice('merchant.buy:'.length)) === normalizedTarget);

    return matches.length === 1 ? (matches[0] ?? action) : action;
  }

  return normalizePotionActionForCurrentState(action, state);
}
