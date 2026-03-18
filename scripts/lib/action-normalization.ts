import type { DisplayState } from './types.ts';

function normalizeMerchantEntryId(entryId: string): string {
  return entryId
    .replace(/^([a-z]+)-\d{2}-/i, '$1-')
    .replace(/^remove-remove-/i, 'remove-');
}

function normalizeRewardEntryId(entryId: string): string {
  return entryId.replace(/-[a-z0-9]{4,}$/i, '');
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

function normalizeProceedActionForCurrentState(action: string, state: DisplayState | null | undefined): string {
  if (action !== 'proceed') {
    return action;
  }

  const availableActions = Array.isArray(state?.actions) ? state.actions : [];
  if (availableActions.includes('rewards.proceed')) {
    return 'rewards.proceed';
  }

  if (state?.screenType === 'event') {
    const proceedOption = (state.menuItems ?? [])
      .find((item) => item?.enabled && (item.id === 'textkey:proceed' || item.label?.trim().toLowerCase() === 'proceed'));
    if (typeof proceedOption?.id === 'string' && proceedOption.id.length > 0) {
      return `event.choose:${proceedOption.id}`;
    }
  }

  const matches = availableActions.filter((candidate) => candidate.endsWith('.proceed') || candidate.endsWith(':proceed'));
  return matches.length === 1 ? (matches[0] ?? action) : action;
}

type RewardKind = 'gold' | 'potion' | 'relic' | 'card' | 'skip';

interface RewardClaimCandidate {
  action: string;
  kind: RewardKind | null;
}

function inferRewardKind(text: string): RewardKind | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes('skip')) {
    return 'skip';
  }
  if (normalized.includes('reward-gold') || /\b\d+\s+gold\b/.test(normalized)) {
    return 'gold';
  }
  if (normalized.includes('reward-potion') || normalized.includes(' potion')) {
    return 'potion';
  }
  if (normalized.includes('reward-relic') || normalized.includes(' relic')) {
    return 'relic';
  }
  if (normalized.includes('reward-card') || normalized.includes('add a card to your deck')) {
    return 'card';
  }

  return null;
}

function toRewardClaimAction(value: string): string | null {
  if (!value) {
    return null;
  }

  if (value.startsWith('rewards.claim:')) {
    return value;
  }

  if (value.startsWith('reward-') || value === 'skip') {
    return `rewards.claim:${value}`;
  }

  return null;
}

function collectRewardClaimCandidates(state: DisplayState | null | undefined): RewardClaimCandidate[] {
  const seen = new Set<string>();
  const candidates: RewardClaimCandidate[] = [];

  const push = (action: string | null, label?: string | null, description?: string | null) => {
    if (!action || seen.has(action)) {
      return;
    }

    seen.add(action);
    const sourceText = [action, label ?? '', description ?? ''].join(' ');
    candidates.push({ action, kind: inferRewardKind(sourceText) });
  };

  for (const action of state?.actions ?? []) {
    if (action.startsWith('rewards.claim:')) {
      push(action);
    }
  }

  for (const item of state?.menuItems ?? []) {
    push(toRewardClaimAction(item?.id ?? ''), item?.label, item?.description);
  }

  return candidates;
}

function normalizeRewardClaimActionForCurrentState(action: string, state: DisplayState | null | undefined): string {
  if (!action.startsWith('rewards.claim:')) {
    return action;
  }

  const availableActions = Array.isArray(state?.actions) ? state.actions : [];
  if (availableActions.includes(action)) {
    return action;
  }

  const suffix = action.slice('rewards.claim:'.length).trim();
  const candidates = collectRewardClaimCandidates(state);
  const candidateActions = candidates.map((candidate) => candidate.action);

  if (candidateActions.includes(action)) {
    return action;
  }

  if (suffix === 'gold' || suffix === 'potion' || suffix === 'relic' || suffix === 'card' || suffix === 'skip') {
    const matches = candidates.filter((candidate) => candidate.kind === suffix);
    return matches.length === 1 ? (matches[0]?.action ?? action) : action;
  }

  const rawRewardId = suffix.startsWith('reward-') || suffix === 'skip'
    ? suffix
    : null;
  if (!rawRewardId) {
    return action;
  }

  const normalizedTarget = normalizeRewardEntryId(rawRewardId);
  const matches = candidateActions.filter((candidate) => {
    const candidateId = candidate.slice('rewards.claim:'.length);
    return candidateId === rawRewardId
      || candidateId.startsWith(`${rawRewardId}-`)
      || normalizeRewardEntryId(candidateId) === normalizedTarget;
  });

  return matches.length === 1 ? (matches[0] ?? action) : action;
}

export function normalizeActionForCurrentState(action: string, state: DisplayState | null | undefined): string {
  action = normalizeProceedActionForCurrentState(action, state);
  action = normalizeRewardClaimActionForCurrentState(action, state);

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

    if (matches.length === 1) {
      return matches[0] ?? action;
    }

    if (state?.screenType === 'merchant_inventory') {
      const matchingMenuItems = (state.menuItems ?? [])
        .filter((item) => typeof item?.id === 'string')
        .filter((item) => normalizeMerchantEntryId(item.id) === normalizedTarget);

      if (matchingMenuItems.length === 1) {
        const item = matchingMenuItems[0];
        const label = item?.label?.trim() || item?.id || targetId;
        if (item?.enabled === false) {
          throw new Error(`Merchant item '${label}' is currently unavailable.`);
        }
      }

      if (matchingMenuItems.length > 1 || matches.length > 1) {
        throw new Error(`Merchant action '${action}' is ambiguous on the current inventory.`);
      }
    }

    return action;
  }

  return normalizePotionActionForCurrentState(action, state);
}
