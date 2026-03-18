import type { CommandAck, DisplayState } from './types.ts';
import { AgentIpcSession, isMissingIpcError, withAgentSession } from './ipc-client.ts';
import { waitForAsync } from './time.ts';
import { buildCombatStabilityKey, isCombatDisplayStable } from './combat-stability.ts';
import { withDisplayStateRunContext } from './display-state-run-context.ts';
import {
  isCombatCardSelectSelectionFollowThroughState,
  isDeckCardSelectFollowThroughState,
  isInteractiveFollowUpTransition,
  isMapTravelFollowThroughState,
  isMerchantActionFollowThroughState,
  isPotionUseFollowThroughState,
  isRewardClaimFollowThroughState,
  isRewardPotionClaimFollowThroughState,
  shouldWaitForCombatFollowThrough,
} from './follow-through-state.ts';
import { hasStateMutated, isCombatStateSettled, stableJson } from './command-state-utils.ts';

// Waiting logic is the fragile part of the command layer. Keeping it isolated
// makes settlement/follow-through behavior easier to evolve without touching
// payload construction or bootstrap flow.

async function getState(session: AgentIpcSession): Promise<DisplayState | null> {
  await session.refreshSnapshot();
  session.assertHealthy();
  return session.state;
}

async function getAck(session: AgentIpcSession): Promise<CommandAck | null> {
  await session.refreshSnapshot();
  session.assertHealthy();
  return session.ack;
}

export async function waitForSettledCombatState(
  session: AgentIpcSession,
  { timeoutMs = 2500, quietPeriodMs = 500, stableSamples = 3 }: { timeoutMs?: number; quietPeriodMs?: number; stableSamples?: number } = {},
): Promise<DisplayState> {
  let lastKey: string | null = null;
  let stableCount = 0;

  return waitForAsync<DisplayState>(
    async () => {
      const state = await getState(session);
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

export async function readDisplayState({ timeoutMs = 2500 }: { timeoutMs?: number } = {}): Promise<DisplayState | null> {
  try {
    return await withAgentSession(async (session) => {
      const state = session.state;
      if (!state) {
        return null;
      }

      if (!shouldWaitForCombatFollowThrough(state)) {
        return withDisplayStateRunContext(state);
      }

      return withDisplayStateRunContext(await waitForSettledCombatState(session, { timeoutMs }));
    }, { timeoutMs });
  } catch (error: unknown) {
    if (isMissingIpcError(error)) {
      return null;
    }

    throw error;
  }
}

export async function waitForAck(
  session: AgentIpcSession,
  id: string,
  { timeoutMs = 10000 }: { timeoutMs?: number } = {},
): Promise<CommandAck> {
  return waitForAsync<CommandAck>(
    async () => {
      const ack = await getAck(session);
      return ack && ack.id === id ? ack : null;
    },
    { timeoutMs, intervalMs: 150, description: `ack ${id}` },
  );
}

export async function waitForCommandSettlement(
  session: AgentIpcSession,
  id: string,
  beforeState: DisplayState | null | undefined,
  { timeoutMs = 12000, allowPendingInteractiveTransition = true }: { timeoutMs?: number; allowPendingInteractiveTransition?: boolean } = {},
): Promise<{ ack: CommandAck | null; state: DisplayState }> {
  return waitForAsync(
    async () => {
      const ack = await getAck(session);
      if (ack?.id === id && ack.status === 'error') {
        throw new Error(ack.message ?? `Command ${id} failed.`);
      }

      const ackCompleted = ack?.id === id && ack.status !== 'pending';
      const state = await getState(session);
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

async function waitForMapTravelFollowThrough(
  session: AgentIpcSession,
  beforeState: DisplayState | null | undefined,
  timeoutMs: number,
  commandId: string | null,
): Promise<DisplayState | null> {
  let lastKey: string | null = null;
  let stableCount = 0;

  return waitForAsync(
    async () => {
      const state = await getState(session);
      if (!isMapTravelFollowThroughState(beforeState, state, commandId)) {
        lastKey = null;
        stableCount = 0;
        return null;
      }

      if (shouldWaitForCombatFollowThrough(state)) {
        lastKey = null;
        stableCount = 0;
        return null;
      }

      if (!state || state.screenType === 'combat_room' || state.screenType === 'combat_card_select' || state.screenType === 'combat_choice_select') {
        return state;
      }

      const key = stableJson({
        screenType: state.screenType,
        menuItems: state.menuItems ?? [],
        actions: state.actions ?? [],
        topBar: state.topBar ?? null,
        map: state.map ?? null,
        event: state.event ?? null,
        cardBrowse: state.cardBrowse ?? null,
        notes: state.notes ?? [],
      });

      if (key !== lastKey) {
        lastKey = key;
        stableCount = 1;
        return null;
      }

      stableCount += 1;
      if (stableCount < 4) {
        return null;
      }

      return state;
    },
    { timeoutMs, intervalMs: 200, description: 'map travel follow-through' },
  );
}

async function waitForRewardClaimFollowThrough(
  session: AgentIpcSession,
  action: string,
  beforeState: DisplayState | null | undefined,
  timeoutMs: number,
): Promise<DisplayState | null> {
  let lastKey: string | null = null;
  let stableCount = 0;

  return waitForAsync(
    async () => {
      const state = await getState(session);
      if (!isRewardClaimFollowThroughState(action, beforeState, state)) {
        lastKey = null;
        stableCount = 0;
        return null;
      }

      const key = stableJson({
        screenType: state?.screenType ?? null,
        topBar: state?.topBar ?? null,
        potions: state?.potions ?? [],
        menuItems: state?.menuItems ?? [],
        actions: state?.actions ?? [],
        notes: state?.notes ?? [],
      });

      if (key !== lastKey) {
        lastKey = key;
        stableCount = 1;
        return null;
      }

      stableCount += 1;
      return stableCount >= 2 ? state : null;
    },
    { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
  );
}

async function waitForCombatEndTurnFollowThrough(
  session: AgentIpcSession,
  action: string,
  beforeState: DisplayState | null | undefined,
  timeoutMs: number,
): Promise<DisplayState | null> {
  const beforeRoundNumber = beforeState?.combat?.roundNumber ?? null;
  const beforeUpdatedAt = beforeState?.updatedAtUtc ?? null;

  return waitForAsync(
    async () => {
      const state = await getState(session);
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

export async function waitForFollowThrough(
  session: AgentIpcSession,
  action: string,
  beforeState: DisplayState | null | undefined,
  { timeoutMs = 12000, commandId = null }: { timeoutMs?: number; commandId?: string | null } = {},
): Promise<DisplayState | null> {
  if (action.startsWith('map.travel:')) {
    return waitForMapTravelFollowThrough(session, beforeState, timeoutMs, commandId);
  }

  if (action.startsWith('rewards.claim:reward-Potion-')) {
    return waitForAsync(
      async () => {
        const state = await getState(session);
        return isRewardPotionClaimFollowThroughState(action, beforeState, state) ? state : null;
      },
      { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
    );
  }

  if (action.startsWith('rewards.claim:')) {
    return waitForRewardClaimFollowThrough(session, action, beforeState, timeoutMs);
  }

  if (action.startsWith('potions.use:')) {
    const referenceState = beforeState ?? await getState(session);
    return waitForAsync(
      async () => {
        const state = await getState(session);
        return isPotionUseFollowThroughState(action, referenceState, state) ? state : null;
      },
      { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
    );
  }

  if (action.startsWith('deck_card_select.select:')) {
    return waitForAsync(
      async () => {
        const state = await getState(session);
        return isDeckCardSelectFollowThroughState(action, beforeState, state) ? state : null;
      },
      { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
    );
  }

  if (action.startsWith('combat_card_select.select:')) {
    return waitForAsync(
      async () => {
        const state = await getState(session);
        return isCombatCardSelectSelectionFollowThroughState(action, beforeState, state) ? state : null;
      },
      { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
    );
  }

  if (action.startsWith('merchant.')) {
    return waitForAsync(
      async () => {
        const state = await getState(session);
        return isMerchantActionFollowThroughState(action, beforeState, state) ? state : null;
      },
      { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
    );
  }

  if (action !== 'combat.end_turn') {
    return null;
  }

  return waitForCombatEndTurnFollowThrough(session, action, beforeState, timeoutMs);
}

export async function waitForScreen(screenType: string, { timeoutMs = 15000 }: { timeoutMs?: number } = {}): Promise<DisplayState> {
  return withAgentSession(async (session) => waitForAsync(
    async () => {
      const state = await getState(session);
      return state?.screenType === screenType ? withDisplayStateRunContext(state) : null;
    },
    { timeoutMs, intervalMs: 150, description: `screen ${screenType}` },
  ), { timeoutMs });
}
