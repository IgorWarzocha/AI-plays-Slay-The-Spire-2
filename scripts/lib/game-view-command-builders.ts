import type { ActionSummaryView, CombatCommandView, CommandView, RunActionsResult, RuntimeCommandOptions } from './types.ts';
import { summarizeCombatActionState, summarizeCostChange } from './game-view-summarizers.ts';
import { buildCombatView, buildGameplayView } from './game-view-state-builders.ts';

function summarizeActionEntry(result: RunActionsResult['results'][number]): ActionSummaryView {
  return {
    action: result.action,
    id: result.id,
    ackStatus: result.ackStatus ?? result.ack?.status ?? null,
    screenType: result.screenType ?? null,
    costChanges: (result.costChanges ?? []).map(summarizeCostChange),
    combatAfter: summarizeCombatActionState(result.state ?? null),
  };
}

export function buildCommandView(result: RunActionsResult, options: RuntimeCommandOptions = {}): CommandView {
  if (options.raw === true || options.raw === 'true') {
    return result as unknown as CommandView;
  }

  return {
    ok: result.ok,
    actionCount: result.actionCount,
    actions: (result.results ?? []).map(summarizeActionEntry),
    state: buildGameplayView(result.state, options),
  };
}

export function buildCombatCommandView(result: RunActionsResult, options: RuntimeCommandOptions = {}): CombatCommandView {
  if (options.raw === true || options.raw === 'true') {
    return result as unknown as CombatCommandView;
  }

  const state = result.state;
  const renderedState = state?.screenType === 'combat_room'
    || state?.screenType === 'combat_card_select'
    || state?.screenType === 'combat_choice_select'
    ? buildCombatView(state, options)
    : buildGameplayView(state, options);

  return {
    ok: result.ok,
    actionCount: result.actionCount,
    actions: (result.results ?? []).map(summarizeActionEntry),
    state: renderedState,
  };
}
