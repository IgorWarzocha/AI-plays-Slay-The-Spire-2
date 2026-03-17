import fs from 'node:fs';

import type { ActionResult, CommandPayload, DisplayState, RunActionsResult, RuntimeCommandOptions } from './types.ts';
import { readAck, readState } from './game-state.ts';
import { STS2_RUNTIME_PATHS } from './runtime-paths.ts';
import { waitFor } from './time.ts';
import { launchGame } from './process-manager.ts';
import { normalizeActionForCurrentState } from './action-normalization.ts';
import { detectCombatCostChanges } from './combat-stability.ts';
import { isAdvancedPlayerCombatTurn } from './follow-through-state.ts';
import {
  waitForAck,
  waitForCommandSettlement,
  waitForFollowThrough,
  waitForScreen,
  waitForSettledCombatState,
} from './command-waiters.ts';

function createCommandId(): string {
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isExplicitFalse(value: unknown): boolean {
  return value === false || value === 'false' || value === '0';
}

function buildCommandPayload(id: string, action: string, options: RuntimeCommandOptions): CommandPayload {
  return {
    id,
    action,
    ...(typeof options.character === 'string' ? { character: options.character } : {}),
    ...(typeof options.seed === 'string' ? { seed: options.seed } : {}),
    ...(typeof options.act1 === 'string' ? { act1: options.act1 } : {}),
  };
}

function readTimeoutOption(value: number | string | undefined, fallback: number): number {
  return Number(value ?? fallback);
}

export function writeCommand(command: CommandPayload): void {
  fs.writeFileSync(STS2_RUNTIME_PATHS.commandPath, `${JSON.stringify(command, null, 2)}\n`);
}

export function sendAction(action: string, options: RuntimeCommandOptions = {}): ActionResult {
  const id = typeof options.id === 'string' ? options.id : createCommandId();
  const beforeState = readState();
  const resolvedAction = normalizeActionForCurrentState(action, beforeState);
  const settleTimeoutMs = readTimeoutOption(options['settle-timeout-ms'] ?? options.settleTimeoutMs, 12000);
  const followThroughTimeoutMs = readTimeoutOption(options['follow-through-timeout-ms'] ?? options.followThroughTimeoutMs, 12000);

  writeCommand(buildCommandPayload(id, resolvedAction, options));
  const ack = waitForAck(id);
  if (ack.status === 'error') {
    throw new Error(ack.message ?? `Command ${resolvedAction} failed.`);
  }

  if (isExplicitFalse(options.strict)) {
    return { action, id, ack, settled: false, state: readState() };
  }

  let followThroughState: DisplayState | null = null;
  const requiresStrictSettlement = resolvedAction.startsWith('map.travel:');
  if (resolvedAction === 'combat.end_turn' || requiresStrictSettlement) {
    try {
      followThroughState = waitForFollowThrough(resolvedAction, beforeState, {
        timeoutMs: followThroughTimeoutMs,
        commandId: id,
      });
    } catch (error: unknown) {
      if (resolvedAction !== 'combat.end_turn') {
        throw error;
      }

      const currentState = readState();
      if (!isAdvancedPlayerCombatTurn(beforeState, currentState)) {
        throw error;
      }

      followThroughState = currentState;
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
