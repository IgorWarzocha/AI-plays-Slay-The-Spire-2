import type { ActionResult, CommandAck, CommandPayload, DisplayState, RunActionsResult, RuntimeCommandOptions } from './types.ts';
import { withAgentSession, type AgentIpcSession } from './ipc-client.ts';
import { waitForAsync } from './time.ts';
import { launchGame } from './process-manager.ts';
import { normalizeActionForCurrentState } from './action-normalization.ts';
import { detectCombatCostChanges } from './combat-stability.ts';
import { withDisplayStateRunContext } from './display-state-run-context.ts';
import { isAdvancedPlayerCombatTurn } from './follow-through-state.ts';
import {
  waitForAck,
  waitForCommandSettlement,
  waitForFollowThrough,
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

function shouldPreferFollowThroughBeforeSettlement(action: string): boolean {
  return action === 'combat.end_turn'
    || action.startsWith('map.travel:')
    || action.startsWith('rewards.claim:')
    || action.startsWith('potions.use:')
    || action.startsWith('deck_card_select.select:')
    || action.startsWith('combat_card_select.select:')
    || action.startsWith('merchant.');
}

async function waitForScreenInSession(
  session: AgentIpcSession,
  screenType: string,
  { timeoutMs = 15000 }: { timeoutMs?: number } = {},
): Promise<DisplayState> {
  return waitForAsync(
    () => {
      session.assertHealthy();
      return session.state?.screenType === screenType ? session.state : null;
    },
    { timeoutMs, intervalMs: 150, description: `screen ${screenType}` },
  );
}

async function sendActionWithSession(session: AgentIpcSession, action: string, options: RuntimeCommandOptions = {}): Promise<ActionResult> {
  const id = typeof options.id === 'string' ? options.id : createCommandId();
  const beforeState = session.state;
  const resolvedAction = normalizeActionForCurrentState(action, beforeState);
  const settleTimeoutMs = readTimeoutOption(options['settle-timeout-ms'] ?? options.settleTimeoutMs, 12000);
  const defaultFollowThroughTimeoutMs = resolvedAction.startsWith('map.travel:') ? 45000 : 12000;
  const followThroughTimeoutMs = readTimeoutOption(
    options['follow-through-timeout-ms'] ?? options.followThroughTimeoutMs,
    defaultFollowThroughTimeoutMs,
  );

  session.sendCommand(buildCommandPayload(id, resolvedAction, options));
  const ack = await waitForAck(session, id);
  if (ack.status === 'error') {
    throw new Error(ack.message ?? `Command ${resolvedAction} failed.`);
  }

  if (isExplicitFalse(options.strict)) {
    return { action, id, ack, settled: false, state: withDisplayStateRunContext(session.state) };
  }

  let followThroughState: DisplayState | null = null;
  const requiresStrictSettlement = resolvedAction.startsWith('map.travel:');
  if (shouldPreferFollowThroughBeforeSettlement(resolvedAction)) {
    try {
      followThroughState = await waitForFollowThrough(session, resolvedAction, beforeState, {
        timeoutMs: followThroughTimeoutMs,
        commandId: id,
      });
    } catch (error: unknown) {
      if (resolvedAction !== 'combat.end_turn') {
        throw error;
      }

      const currentState = session.state;
      if (!isAdvancedPlayerCombatTurn(beforeState, currentState)) {
        throw error;
      }

      followThroughState = currentState;
    }
  }

  const settlement = followThroughState
    ? null
    : await waitForCommandSettlement(session, id, beforeState, {
        timeoutMs: settleTimeoutMs,
        allowPendingInteractiveTransition: !requiresStrictSettlement,
      });

  const fallbackFollowThroughState = followThroughState
    ?? (requiresStrictSettlement
      ? null
      : await waitForFollowThrough(session, resolvedAction, beforeState, {
          timeoutMs: followThroughTimeoutMs,
          commandId: id,
        }));

  const finalState = followThroughState
    ?? fallbackFollowThroughState
    ?? settlement?.state
    ?? await (async () => {
      try {
        return await waitForSettledCombatState(session);
      } catch {
        return session.state;
      }
    })();
  const annotatedFinalState = withDisplayStateRunContext(finalState);
  const finalAck: CommandAck | null = session.ack;

  return {
    action,
    resolvedAction,
    id,
    ack: finalAck?.id === id ? finalAck : ack,
    settled: true,
    ackStatus: finalAck?.id === id ? finalAck.status : ack.status,
    screenType: annotatedFinalState?.screenType ?? null,
    costChanges: detectCombatCostChanges(beforeState, annotatedFinalState),
    state: annotatedFinalState,
  };
}

export async function sendAction(action: string, options: RuntimeCommandOptions = {}): Promise<ActionResult> {
  return withAgentSession((session) => sendActionWithSession(session, action, options));
}

export async function runActions(actions: readonly string[], options: RuntimeCommandOptions = {}): Promise<RunActionsResult> {
  return withAgentSession(async (session) => {
    const results: ActionResult[] = [];

    for (const action of actions) {
      const actionOptions: RuntimeCommandOptions = actions.length === 1 || options.id == null
        ? options
        : { ...options };

      if (actions.length !== 1 && 'id' in actionOptions) {
        delete actionOptions.id;
      }

      results.push(await sendActionWithSession(session, action, actionOptions));
    }

    return {
      ok: true,
      actionCount: results.length,
      results,
      state: results.at(-1)?.state ?? withDisplayStateRunContext(session.state),
    };
  });
}

export async function startStandardRun(options: RuntimeCommandOptions = {}): Promise<DisplayState | null> {
  await launchGame();

  return withAgentSession(async (session) => {
    await waitForScreenInSession(session, 'main_menu', { timeoutMs: 60000 });
    await sendActionWithSession(session, 'main_menu.singleplayer', { id: `cmd-${Date.now()}-menu` });
    await waitForScreenInSession(session, 'singleplayer_submenu');
    await sendActionWithSession(session, 'singleplayer.standard', { id: `cmd-${Date.now()}-singleplayer` });
    await waitForScreenInSession(session, 'character_select');

    const startOptions: RuntimeCommandOptions = {
      id: `cmd-${Date.now()}-start`,
      character: typeof options.character === 'string' ? options.character : 'ironclad',
      act1: typeof options.act1 === 'string' ? options.act1 : 'act1',
    };
    if (typeof options.seed === 'string') {
      startOptions.seed = options.seed;
    }
    await sendActionWithSession(session, 'character.start_run', startOptions);

    await waitForAsync(
      () => {
        session.assertHealthy();
        const state = session.state;
        return state && state.screenType !== 'character_select' ? state : null;
      },
      { timeoutMs: 20000, intervalMs: 250, description: 'run to leave character select' },
    );

    return withDisplayStateRunContext(session.state);
  }, { timeoutMs: 60000 });
}
