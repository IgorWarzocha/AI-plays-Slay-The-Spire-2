import type { ActionSummaryView, CombatCommandView, CommandView, DisplayState, RunActionsResult, RuntimeCommandOptions } from './types.ts';
import { summarizeCombatActionState, summarizeCostChange } from './game-view-summarizers.ts';
import { buildCombatView, buildGameplayView } from './game-view-state-builders.ts';
import { resolveViewMode } from './view-options.ts';

function shouldIncludeCommandMenuItems(state: DisplayState | null | undefined): boolean {
  return state?.screenType === 'rewards_screen'
    || state?.screenType === 'card_reward_selection'
    || state?.screenType === 'deck_card_select'
    || state?.screenType === 'merchant_inventory'
    || state?.screenType === 'treasure_relic_selection'
    || state?.screenType === 'combat_card_select'
    || state?.screenType === 'combat_choice_select';
}

function shouldIncludeCommandNotes(state: DisplayState | null | undefined): boolean {
  return state?.screenType === 'rewards_screen'
    || state?.screenType === 'deck_card_select'
    || state?.screenType === 'combat_card_select'
    || state?.screenType === 'combat_choice_select';
}

function withCommandStateSurface(state: DisplayState | null | undefined, options: RuntimeCommandOptions = {}): RuntimeCommandOptions {
  return {
    ...options,
    actions: true,
    menu: shouldIncludeCommandMenuItems(state),
    notes: shouldIncludeCommandNotes(state),
  };
}

function summarizeActionEntry(
  result: RunActionsResult['results'][number],
  _options: RuntimeCommandOptions = {},
): ActionSummaryView {
  return {
    action: result.action,
    id: result.id,
    ackStatus: result.ackStatus ?? result.ack?.status ?? null,
    screenType: result.screenType ?? null,
    costChanges: (result.costChanges ?? []).map(summarizeCostChange),
    combatAfter: summarizeCombatActionState(result.state ?? null, 'hard'),
  };
}

export function buildCommandView(result: RunActionsResult, options: RuntimeCommandOptions = {}): CommandView {
  if (resolveViewMode(options) === 'full') {
    return result as unknown as CommandView;
  }

  const stateOptions = withCommandStateSurface(result.state, options);

  return {
    ok: result.ok,
    actionCount: result.actionCount,
    actions: (result.results ?? []).map((entry) => summarizeActionEntry(entry, options)),
    state: buildGameplayView(result.state, stateOptions),
  };
}

export function buildCombatCommandView(result: RunActionsResult, options: RuntimeCommandOptions = {}): CombatCommandView {
  if (resolveViewMode(options) === 'full') {
    return result as unknown as CombatCommandView;
  }

  const state = result.state;
  const stateOptions = withCommandStateSurface(state, options);
  const renderedState = state?.screenType === 'combat_room'
    || state?.screenType === 'combat_card_select'
    || state?.screenType === 'combat_choice_select'
    ? buildCombatView(state, stateOptions)
    : buildGameplayView(state, stateOptions);

  return {
    ok: result.ok,
    actionCount: result.actionCount,
    actions: (result.results ?? []).map((entry) => summarizeActionEntry(entry, options)),
    state: renderedState,
  };
}
