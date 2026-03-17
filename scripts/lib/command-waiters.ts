import type { CommandAck, DisplayState } from './types.ts';
import { readAck, readState } from './game-state.ts';
import { waitFor } from './time.ts';
import { buildCombatStabilityKey, isCombatDisplayStable } from './combat-stability.ts';
import {
  isDeckCardSelectFollowThroughState,
  isInteractiveFollowUpTransition,
  isMapTravelFollowThroughState,
  isMerchantActionFollowThroughState,
  isPotionUseFollowThroughState,
  isRewardPotionClaimFollowThroughState,
  shouldWaitForCombatFollowThrough,
} from './follow-through-state.ts';
import { hasStateMutated, isCombatStateSettled } from './command-state-utils.ts';

// Waiting logic is the fragile part of the command layer. Keeping it isolated
// makes settlement/follow-through behavior easier to evolve without touching
// payload construction or bootstrap flow.

export function waitForSettledCombatState({ timeoutMs = 2500, quietPeriodMs = 500, stableSamples = 3 }: { timeoutMs?: number; quietPeriodMs?: number; stableSamples?: number } = {}): DisplayState {
  let lastKey: string | null = null;
  let stableCount = 0;

  return waitFor<DisplayState>(
    () => {
      const state = readState();
      if (!state || !isCombatDisplayStable(state, { quietPeriodMs })) {
        lastKey = null;
        stableCount = 0;
        return null;
      }

      const key = buildCombatStabilityKey(state);
      if (key !== lastKey) {
        lastKey = key;
        stableCount = 1;
        return null;
      }

      stableCount += 1;
      return stableCount >= stableSamples ? state : null;
    },
    { timeoutMs, intervalMs: 150, description: 'stable combat state' },
  );
}

export function readDisplayState({ timeoutMs = 2500 }: { timeoutMs?: number } = {}): DisplayState | null {
  const state = readState();
  if (!state) {
    return null;
  }

  if (!shouldWaitForCombatFollowThrough(state)) {
    return state;
  }

  return waitForSettledCombatState({ timeoutMs });
}

export function waitForAck(id: string, { timeoutMs = 10000 }: { timeoutMs?: number } = {}): CommandAck {
  return waitFor<CommandAck>(
    () => {
      const ack = readAck();
      return ack && ack.id === id ? ack : null;
    },
    { timeoutMs, intervalMs: 150, description: `ack ${id}` },
  );
}

export function waitForCommandSettlement(
  id: string,
  beforeState: DisplayState | null | undefined,
  { timeoutMs = 12000, allowPendingInteractiveTransition = true }: { timeoutMs?: number; allowPendingInteractiveTransition?: boolean } = {},
): { ack: CommandAck | null; state: DisplayState } {
  return waitFor(
    () => {
      const ack = readAck();
      if (ack?.id === id && ack.status === 'error') {
        throw new Error(ack.message ?? `Command ${id} failed.`);
      }

      const ackCompleted = ack?.id === id && ack.status !== 'pending';
      const state = readState();
      if (!state || state.lastHandledCommandId !== id) {
        return null;
      }

      if (allowPendingInteractiveTransition && isInteractiveFollowUpTransition(beforeState, state, ack)) {
        return { ack, state };
      }

      if (!ackCompleted || !isCombatStateSettled(state)) {
        return null;
      }

      return hasStateMutated(beforeState, state) ? { ack, state } : null;
    },
    { timeoutMs, intervalMs: 150, description: `command ${id} state mutation` },
  );
}

function waitForMapTravelFollowThrough(beforeState: DisplayState | null | undefined, timeoutMs: number, commandId: string | null): DisplayState | null {
  return waitFor(
    () => {
      const state = readState();
      if (!isMapTravelFollowThroughState(beforeState, state, commandId)) {
        return null;
      }

      if (shouldWaitForCombatFollowThrough(state)) {
        return null;
      }

      return state;
    },
    { timeoutMs, intervalMs: 200, description: 'map travel follow-through' },
  );
}

function waitForCombatEndTurnFollowThrough(action: string, beforeState: DisplayState | null | undefined, timeoutMs: number): DisplayState | null {
  const beforeRoundNumber = beforeState?.combat?.roundNumber ?? null;
  const beforeUpdatedAt = beforeState?.updatedAtUtc ?? null;

  return waitFor(
    () => {
      const state = readState();
      if (!state?.updatedAtUtc || state.updatedAtUtc === beforeUpdatedAt) {
        return null;
      }

      if (state.screenType !== 'combat_room') {
        return state;
      }

      const combat = state.combat;
      if (!combat) {
        return state;
      }

      if (combat.currentSide !== 'Player') {
        return null;
      }

      if (beforeRoundNumber === null || beforeRoundNumber === undefined || (combat.roundNumber ?? 0) > beforeRoundNumber) {
        const handCount = Array.isArray(combat.hand) ? combat.hand.length : 0;
        const visibleMenuCount = Array.isArray(state.menuItems) ? state.menuItems.length : 0;
        if ((handCount > 0 || visibleMenuCount > 0) && isCombatStateSettled(state)) {
          return state;
        }
      }

      return null;
    },
    { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
  );
}

export function waitForFollowThrough(
  action: string,
  beforeState: DisplayState | null | undefined,
  { timeoutMs = 12000, commandId = null }: { timeoutMs?: number; commandId?: string | null } = {},
): DisplayState | null {
  if (action.startsWith('map.travel:')) {
    return waitForMapTravelFollowThrough(beforeState, timeoutMs, commandId);
  }

  if (action.startsWith('rewards.claim:reward-Potion-')) {
    return waitFor(
      () => {
        const state = readState();
        return isRewardPotionClaimFollowThroughState(action, beforeState, state) ? state : null;
      },
      { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
    );
  }

  if (action.startsWith('potions.use:')) {
    const referenceState = beforeState ?? readState();
    return waitFor(
      () => {
        const state = readState();
        return isPotionUseFollowThroughState(action, referenceState, state) ? state : null;
      },
      { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
    );
  }

  if (action.startsWith('deck_card_select.select:')) {
    return waitFor(
      () => {
        const state = readState();
        return isDeckCardSelectFollowThroughState(action, beforeState, state) ? state : null;
      },
      { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
    );
  }

  if (action.startsWith('merchant.')) {
    return waitFor(
      () => {
        const state = readState();
        return isMerchantActionFollowThroughState(action, beforeState, state) ? state : null;
      },
      { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
    );
  }

  if (action !== 'combat.end_turn') {
    return null;
  }

  return waitForCombatEndTurnFollowThrough(action, beforeState, timeoutMs);
}

export function waitForScreen(screenType: string, { timeoutMs = 15000 }: { timeoutMs?: number } = {}): DisplayState {
  return waitFor(
    () => {
      const state = readState();
      return state?.screenType === screenType ? state : null;
    },
    { timeoutMs, intervalMs: 150, description: `screen ${screenType}` },
  );
}
