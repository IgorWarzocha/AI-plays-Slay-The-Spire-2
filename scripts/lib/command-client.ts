import fs from 'node:fs';

import type { CommandAck, CommandPayload, DisplayState, RuntimeCommandOptions, RunActionsResult, ActionResult } from './types.ts';
import { readAck, readState } from './game-state.ts';
import { STS2_RUNTIME_PATHS } from './runtime-paths.ts';
import { waitFor } from './time.ts';
import { launchGame } from './process-manager.ts';
import { normalizeActionForCurrentState } from './action-normalization.ts';
import { buildCombatStabilityKey, detectCombatCostChanges, isCombatDisplayStable } from './combat-stability.ts';
import {
  isAdvancedPlayerCombatTurn,
  isDeckCardSelectFollowThroughState,
  isInteractiveFollowUpTransition,
  isMapTravelFollowThroughState,
  isMerchantActionFollowThroughState,
  isMerchantInventoryConsistent,
  isPotionUseFollowThroughState,
  isRewardPotionClaimFollowThroughState,
  shouldWaitForCombatFollowThrough,
} from './follow-through-state.ts';
import { hasStateMutated, isCombatStateSettled } from './command-state-utils.ts';

export { normalizeActionForCurrentState } from './action-normalization.ts';
export { buildCombatStabilityKey, detectCombatCostChanges, isCombatDisplayStable } from './combat-stability.ts';
export {
  isDeckCardSelectFollowThroughState,
  isInteractiveFollowUpTransition,
  isMapTravelFollowThroughState,
  isMerchantActionFollowThroughState,
  isPotionUseFollowThroughState,
  isRewardPotionClaimFollowThroughState,
  isMerchantInventoryConsistent,
} from './follow-through-state.ts';

function createCommandId(): string {
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isExplicitFalse(value: unknown): boolean {
  return value === false || value === 'false' || value === '0';
}

function waitForSettledCombatState({ timeoutMs = 2500, quietPeriodMs = 500, stableSamples = 3 }: { timeoutMs?: number; quietPeriodMs?: number; stableSamples?: number } = {}): DisplayState {
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

export function writeCommand(command: CommandPayload): void {
  fs.writeFileSync(STS2_RUNTIME_PATHS.commandPath, `${JSON.stringify(command, null, 2)}\n`);
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

export function waitForFollowThrough(action: string, beforeState: DisplayState | null | undefined, { timeoutMs = 12000, commandId = null }: { timeoutMs?: number; commandId?: string | null } = {}): DisplayState | null {
  if (action.startsWith('map.travel:')) {
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
      { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
    );
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

export function waitForScreen(screenType: string, { timeoutMs = 15000 }: { timeoutMs?: number } = {}): DisplayState {
  return waitFor(
    () => {
      const state = readState();
      return state?.screenType === screenType ? state : null;
    },
    { timeoutMs, intervalMs: 150, description: `screen ${screenType}` },
  );
}

export function sendAction(action: string, options: RuntimeCommandOptions = {}): ActionResult {
  const id = typeof options.id === 'string' ? options.id : createCommandId();
  const beforeState = readState();
  const resolvedAction = normalizeActionForCurrentState(action, beforeState);
  const settleTimeoutMs = Number(options['settle-timeout-ms'] ?? options.settleTimeoutMs ?? 12000);
  const followThroughTimeoutMs = Number(options['follow-through-timeout-ms'] ?? options.followThroughTimeoutMs ?? 12000);
  const payload: CommandPayload = {
    id,
    action: resolvedAction,
    ...(typeof options.character === 'string' ? { character: options.character } : {}),
    ...(typeof options.seed === 'string' ? { seed: options.seed } : {}),
    ...(typeof options.act1 === 'string' ? { act1: options.act1 } : {}),
  };

  writeCommand(payload);
  const ack = waitForAck(id);
  if (ack.status === 'error') {
    throw new Error(ack.message ?? `Command ${resolvedAction} failed.`);
  }

  if (isExplicitFalse(options.strict)) {
    return { action, id, ack, settled: false, state: readState() };
  }

  let followThroughState: DisplayState | null = null;
  const requiresStrictSettlement = resolvedAction.startsWith('map.travel:');
  if (resolvedAction === 'combat.end_turn' || resolvedAction.startsWith('map.travel:')) {
    try {
      followThroughState = waitForFollowThrough(resolvedAction, beforeState, {
        timeoutMs: followThroughTimeoutMs,
        commandId: id,
      });
    } catch (error: unknown) {
      if (resolvedAction === 'combat.end_turn') {
        const currentState = readState();
        if (!isAdvancedPlayerCombatTurn(beforeState, currentState)) {
          throw error;
        }

        followThroughState = currentState;
      } else {
        throw error;
      }
    }
  }

  const settlement = followThroughState
    ? null
    : waitForCommandSettlement(id, beforeState, {
        timeoutMs: settleTimeoutMs,
        allowPendingInteractiveTransition: !requiresStrictSettlement,
      });

  const fallbackFollowThroughState = followThroughState
    ?? (requiresStrictSettlement
      ? null
      : waitForFollowThrough(resolvedAction, beforeState, {
          timeoutMs: followThroughTimeoutMs,
          commandId: id,
        }));

  const finalState = followThroughState
    ?? fallbackFollowThroughState
    ?? settlement?.state
    ?? (() => {
      try {
        return waitForSettledCombatState();
      } catch {
        return readState();
      }
    })();
  const finalAck = readAck();

  return {
    action,
    resolvedAction,
    id,
    ack: finalAck?.id === id ? finalAck : ack,
    settled: true,
    ackStatus: finalAck?.id === id ? finalAck.status : ack.status,
    screenType: finalState?.screenType ?? null,
    costChanges: detectCombatCostChanges(beforeState, finalState),
    state: finalState,
  };
}

export function runActions(actions: readonly string[], options: RuntimeCommandOptions = {}): RunActionsResult {
  const results: ActionResult[] = [];

  for (const action of actions) {
    const actionOptions: RuntimeCommandOptions = actions.length === 1 || options.id == null
      ? options
      : { ...options };

    if (actions.length !== 1 && 'id' in actionOptions) {
      delete actionOptions.id;
    }

    results.push(sendAction(action, actionOptions));
  }

  return {
    ok: true,
    actionCount: results.length,
    results,
    state: results.at(-1)?.state ?? readState(),
  };
}

export function startStandardRun(options: RuntimeCommandOptions = {}): DisplayState | null {
  launchGame();
  waitForScreen('main_menu', { timeoutMs: 60000 });
  sendAction('main_menu.singleplayer', { id: `cmd-${Date.now()}-menu` });
  waitForScreen('singleplayer_submenu');
  sendAction('singleplayer.standard', { id: `cmd-${Date.now()}-singleplayer` });
  waitForScreen('character_select');
  const startOptions: RuntimeCommandOptions = {
    id: `cmd-${Date.now()}-start`,
    character: typeof options.character === 'string' ? options.character : 'ironclad',
    act1: typeof options.act1 === 'string' ? options.act1 : 'act1',
  };
  if (typeof options.seed === 'string') {
    startOptions.seed = options.seed;
  }
  sendAction('character.start_run', startOptions);

  waitFor(
    () => {
      const state = readState();
      return state && state.screenType !== 'character_select' ? state : null;
    },
    { timeoutMs: 20000, intervalMs: 250, description: 'run to leave character select' },
  );

  return readState();
}
