export function stableJson(value) {
  return JSON.stringify(value ?? null);
}

export function parseInstant(value) {
  if (!value || typeof value !== "string") {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function isCombatLikeScreen(screenType) {
  return screenType === "combat_room"
    || screenType === "combat_card_select"
    || screenType === "combat_choice_select";
}

export function isMerchantLikeScreen(screenType) {
  return screenType === "merchant_room"
    || screenType === "merchant_inventory"
    || screenType === "deck_card_select";
}

export function isTransitionShellState(state) {
  if (!state) {
    return true;
  }

  if (state.screenType === "run_active") {
    return true;
  }

  if (state.screenType === "combat_room" && !state.combat) {
    return true;
  }

  return false;
}

export function isCombatStateSettled(state) {
  if (!state || !isCombatLikeScreen(state.screenType)) {
    return true;
  }

  if (state.screenType === "combat_choice_select") {
    return true;
  }

  const combat = state.combat;
  if (!combat) {
    return false;
  }

  return combat.handIsSettled === true;
}

export function isQuietSinceLastUpdate(state, quietPeriodMs = 500) {
  const updatedAt = parseInstant(state?.updatedAtUtc);
  return Number.isFinite(updatedAt) && Date.now() - updatedAt >= quietPeriodMs;
}

export function isNewerState(referenceState, state) {
  if (!state?.updatedAtUtc) {
    return false;
  }

  return parseInstant(state.updatedAtUtc) > parseInstant(referenceState?.updatedAtUtc);
}

export function hasStateMutated(beforeState, state) {
  if (!state) {
    return false;
  }

  const beforeUpdatedAt = beforeState?.updatedAtUtc ?? null;
  const updatedChanged = state.updatedAtUtc && state.updatedAtUtc !== beforeUpdatedAt;
  return updatedChanged && stableJson(state) !== stableJson(beforeState);
}
