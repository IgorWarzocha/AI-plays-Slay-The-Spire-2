import type { DisplayState } from './types.ts';

export function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function parseInstant(value: string | null | undefined): number {
  if (!value || typeof value !== 'string') {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function isCombatLikeScreen(screenType: string | null | undefined): boolean {
  return screenType === 'combat_room'
    || screenType === 'combat_card_select'
    || screenType === 'combat_choice_select';
}

export function isMerchantLikeScreen(screenType: string | null | undefined): boolean {
  return screenType === 'merchant_room'
    || screenType === 'merchant_inventory'
    || screenType === 'deck_card_select';
}

export function isTransitionShellState(state: DisplayState | null | undefined): boolean {
  if (!state) {
    return true;
  }

  if (state.screenType === 'run_active') {
    return true;
  }

  if (state.screenType === 'combat_room' && !state.combat) {
    return true;
  }

  return false;
}

export function isCombatStateSettled(state: DisplayState | null | undefined): boolean {
  if (!state || !isCombatLikeScreen(state.screenType)) {
    return true;
  }

  if (state.screenType === 'combat_choice_select') {
    return true;
  }

  const combat = state.combat;
  if (!combat) {
    return false;
  }

   const noVisibleAnimation = combat.cardPlayInProgress !== true
    && combat.handAnimationActive !== true
    && (combat.pendingHandHolderCount ?? 0) === 0;

  if (state.screenType === 'combat_card_select') {
    const hasSelectionPrompt = typeof combat.selectionPrompt === 'string' && combat.selectionPrompt.length > 0;
    const hasSelectionActions = Array.isArray(state.actions) && state.actions.some((action) => typeof action === 'string' && action.startsWith('combat_card_select.'));
    const hasSelectionMenuItems = Array.isArray(state.menuItems) && state.menuItems.length > 0;

    if (hasSelectionPrompt && (hasSelectionActions || hasSelectionMenuItems) && noVisibleAnimation) {
      return true;
    }
  }

  if (combat.handIsSettled === true) {
    return true;
  }

  if (combat.handIsSettled === false) {
    return false;
  }

  const hasRenderableHand = Array.isArray(combat.hand) && combat.hand.length > 0;
  const canReasonFromPlayerTurn = combat.currentSide === 'Player' && typeof combat.canEndTurn === 'boolean';

  return hasRenderableHand && canReasonFromPlayerTurn && noVisibleAnimation;
}

export function isQuietSinceLastUpdate(state: DisplayState | null | undefined, quietPeriodMs = 500): boolean {
  const updatedAt = parseInstant(state?.updatedAtUtc ?? null);
  return Number.isFinite(updatedAt) && Date.now() - updatedAt >= quietPeriodMs;
}

export function isNewerState(referenceState: DisplayState | null | undefined, state: DisplayState | null | undefined): boolean {
  if (!state?.updatedAtUtc) {
    return false;
  }

  return parseInstant(state.updatedAtUtc) > parseInstant(referenceState?.updatedAtUtc ?? null);
}

export function hasStateMutated(beforeState: DisplayState | null | undefined, state: DisplayState | null | undefined): boolean {
  if (!state) {
    return false;
  }

  const beforeUpdatedAt = beforeState?.updatedAtUtc ?? null;
  const updatedChanged = state.updatedAtUtc && state.updatedAtUtc !== beforeUpdatedAt;
  return Boolean(updatedChanged) && stableJson(state) !== stableJson(beforeState);
}
