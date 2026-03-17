import type { CommandAck, DisplayState } from './types.ts';
import {
  hasStateMutated,
  isCombatLikeScreen,
  isCombatStateSettled,
  isMerchantLikeScreen,
  isNewerState,
  isQuietSinceLastUpdate,
  isTransitionShellState,
  stableJson,
} from './command-state-utils.ts';

// These predicates answer one question only: "has the game reached the first
// post-command frame that is safe to reason from?" Keeping them pure makes the
// waiting logic testable without having to mock file IO or timers.

export function isInteractiveFollowUpTransition(beforeState: DisplayState | null | undefined, state: DisplayState | null | undefined, ack: CommandAck | null | undefined): boolean {
  if (!beforeState || !state || !ack || ack.status !== 'pending') {
    return false;
  }

  if (!hasStateMutated(beforeState, state)) {
    return false;
  }

  return state.screenType !== beforeState.screenType;
}

export function isRewardPotionClaimFollowThroughState(action: string, beforeState: DisplayState | null | undefined, state: DisplayState | null | undefined): boolean {
  if (!action.startsWith('rewards.claim:reward-Potion-')) {
    return false;
  }

  if (!beforeState || !state || !isNewerState(beforeState, state)) {
    return false;
  }

  return stableJson({
    screenType: state.screenType,
    potions: state.potions ?? [],
    menuItems: state.menuItems ?? [],
  }) !== stableJson({
    screenType: beforeState.screenType,
    potions: beforeState.potions ?? [],
    menuItems: beforeState.menuItems ?? [],
  });
}

export function isRewardClaimFollowThroughState(action: string, beforeState: DisplayState | null | undefined, state: DisplayState | null | undefined): boolean {
  if (!action.startsWith('rewards.claim:')) {
    return false;
  }

  if (!beforeState || !state || !isNewerState(beforeState, state)) {
    return false;
  }

  return stableJson({
    screenType: state.screenType,
    topBar: state.topBar ?? null,
    potions: state.potions ?? [],
    menuItems: state.menuItems ?? [],
    actions: state.actions ?? [],
    notes: state.notes ?? [],
  }) !== stableJson({
    screenType: beforeState.screenType,
    topBar: beforeState.topBar ?? null,
    potions: beforeState.potions ?? [],
    menuItems: beforeState.menuItems ?? [],
    actions: beforeState.actions ?? [],
    notes: beforeState.notes ?? [],
  });
}

export function isMerchantInventoryConsistent(state: DisplayState | null | undefined): boolean {
  if (state?.screenType !== 'merchant_inventory') {
    return true;
  }

  const gold = state.topBar?.gold ?? null;
  if (gold == null || !Array.isArray(state.menuItems)) {
    return true;
  }

  for (const item of state.menuItems) {
    if (item?.id === 'close') {
      continue;
    }

    const description = typeof item?.description === 'string' ? item.description : '';
    const soldOut = description.includes('Sold out.') || description.includes('Already used.');
    if (soldOut) {
      continue;
    }

    const costMatch = description.match(/Cost:\s*(\d+)\s*gold/i);
    if (!costMatch) {
      continue;
    }

    const cost = Number.parseInt(costMatch[1] ?? '', 10);
    if (!Number.isFinite(cost)) {
      continue;
    }

    const saysNotEnoughGold = description.includes('Not enough gold.');
    if (saysNotEnoughGold && gold >= cost) {
      return false;
    }
  }

  return true;
}

export function isDeckCardSelectFollowThroughState(
  action: string,
  beforeState: DisplayState | null | undefined,
  state: DisplayState | null | undefined,
  { quietPeriodMs = 500 }: { quietPeriodMs?: number } = {},
): boolean {
  if (!action.startsWith('deck_card_select.select:')) {
    return false;
  }

  if (beforeState?.screenType !== 'deck_card_select') {
    return false;
  }

  if (!state || !isNewerState(beforeState, state)) {
    return false;
  }

  if (state.screenType === 'deck_card_select') {
    return false;
  }

  if (state.screenType === 'combat_room') {
    return isCombatStateSettled(state);
  }

  if (state.screenType === 'merchant_inventory') {
    return isMerchantInventoryConsistent(state);
  }

  return !isTransitionShellState(state);
}

export function isCombatCardSelectSelectionFollowThroughState(
  action: string,
  beforeState: DisplayState | null | undefined,
  state: DisplayState | null | undefined,
): boolean {
  if (!action.startsWith('combat_card_select.select:')) {
    return false;
  }

  if (beforeState?.screenType !== 'combat_card_select') {
    return false;
  }

  if (!state || !isNewerState(beforeState, state)) {
    return false;
  }

  if (state.screenType === 'combat_room') {
    return isCombatStateSettled(state);
  }

  if (state.screenType !== 'combat_card_select') {
    return false;
  }

  const selectedAction = action;
  const actions = state.actions ?? [];
  const notes = state.notes ?? [];

  if (!actions.includes(selectedAction) && (actions.includes('combat_card_select.confirm') || notes.some((note) => typeof note === 'string' && note.includes('Selection progress: 1/1')))) {
    return true;
  }

  return stableJson({
    actions,
    notes,
    menuItems: state.menuItems ?? [],
    hand: state.combat?.hand ?? [],
  }) !== stableJson({
    actions: beforeState.actions ?? [],
    notes: beforeState.notes ?? [],
    menuItems: beforeState.menuItems ?? [],
    hand: beforeState.combat?.hand ?? [],
  });
}

export function isMerchantActionFollowThroughState(
  action: string,
  beforeState: DisplayState | null | undefined,
  state: DisplayState | null | undefined,
  { quietPeriodMs = 500 }: { quietPeriodMs?: number } = {},
): boolean {
  if (!action.startsWith('merchant.')) {
    return false;
  }

  if (!isMerchantLikeScreen(beforeState?.screenType)) {
    return false;
  }

  if (!state || !isNewerState(beforeState, state)) {
    return false;
  }

  if (action === 'merchant.leave') {
    return state.screenType === 'map_screen';
  }

  if (action === 'merchant.close') {
    return state.screenType === 'merchant_room';
  }

  if (action === 'merchant.open') {
    if (state.screenType !== 'merchant_inventory') {
      return false;
    }

    return isMerchantInventoryConsistent(state);
  }

  if (!action.startsWith('merchant.buy:')) {
    return false;
  }

  if (state.screenType === 'deck_card_select') {
    const prompt = Array.isArray(state.notes)
      ? state.notes.find((note) => typeof note === 'string' && note.startsWith('Prompt:'))
      : null;

    return Array.isArray(state.menuItems)
      && state.menuItems.length > 0
      && typeof prompt === 'string'
      && prompt.length > 'Prompt:'.length;
  }

  if (state.screenType !== 'merchant_inventory') {
    return false;
  }

  return isMerchantInventoryConsistent(state);
}

export function isPotionUseFollowThroughState(action: string, referenceState: DisplayState | null | undefined, state: DisplayState | null | undefined): boolean {
  if (!action.startsWith('potions.use:')) {
    return false;
  }

  if (!referenceState || !state || !isNewerState(referenceState, state)) {
    return false;
  }

  return stableJson({
    screenType: state.screenType,
    hp: state.topBar?.currentHp ?? null,
    potions: state.potions ?? [],
  }) !== stableJson({
    screenType: referenceState.screenType,
    hp: referenceState.topBar?.currentHp ?? null,
    potions: referenceState.potions ?? [],
  });
}

export function isMapTravelFollowThroughState(beforeState: DisplayState | null | undefined, state: DisplayState | null | undefined, commandId: string | null = null): boolean {
  if (!beforeState || !state || !isNewerState(beforeState, state)) {
    return false;
  }

  if (isTransitionShellState(state)) {
    return false;
  }

  if (commandId && state.lastHandledCommandId !== commandId) {
    return false;
  }

  if (state.screenType === 'map_screen' || state.screenType === 'map') {
    if (state.map?.traveling || state.map?.travelEnabled === false) {
      return false;
    }
  }

  if (state.screenType !== beforeState.screenType) {
    return true;
  }

  return stableJson({
    screenType: state.screenType,
    menuItems: state.menuItems ?? [],
    actions: state.actions ?? [],
    topBar: state.topBar ?? null,
    map: state.map ?? null,
    combat: state.combat ?? null,
  }) !== stableJson({
    screenType: beforeState.screenType,
    menuItems: beforeState.menuItems ?? [],
    actions: beforeState.actions ?? [],
    topBar: beforeState.topBar ?? null,
    map: beforeState.map ?? null,
    combat: beforeState.combat ?? null,
  });
}

export function isAdvancedPlayerCombatTurn(beforeState: DisplayState | null | undefined, state: DisplayState | null | undefined): boolean {
  if (state?.screenType !== 'combat_room') {
    return false;
  }

  const beforeRoundNumber = beforeState?.combat?.roundNumber ?? null;
  const combat = state.combat;
  if (!combat || combat.currentSide !== 'Player') {
    return false;
  }

  if (beforeRoundNumber !== null && beforeRoundNumber !== undefined && (combat.roundNumber ?? 0) <= beforeRoundNumber) {
    return false;
  }

  const handCount = Array.isArray(combat.hand) ? combat.hand.length : 0;
  const visibleMenuCount = Array.isArray(state.menuItems) ? state.menuItems.length : 0;
  return (handCount > 0 || visibleMenuCount > 0) && isCombatStateSettled(state);
}

export function shouldWaitForCombatFollowThrough(state: DisplayState | null | undefined): boolean {
  return isCombatLikeScreen(state?.screenType) && !isCombatStateSettled(state);
}
