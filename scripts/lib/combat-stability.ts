import type { CombatCardState, CombatCostChange, CreatureState, DisplayState } from './types.ts';
import { hasStickyCombatPlayFlagFallback, isCombatLikeScreen, isCombatStateSettled } from './command-state-utils.ts';

// Combat state often mutates across a few animation frames. These helpers
// define what counts as a readable frame so command orchestration can wait for
// stable game state instead of racing transient UI updates.

export function buildCombatStabilityKey(state: DisplayState | null | undefined): string {
  if (!state || !isCombatLikeScreen(state.screenType)) {
    return JSON.stringify({ screenType: state?.screenType ?? null });
  }

  const combat = state.combat ?? {};
  return JSON.stringify({
    screenType: state.screenType,
    roundNumber: combat.roundNumber ?? null,
    currentSide: combat.currentSide ?? null,
    energy: combat.energy ?? null,
    handIds: Array.isArray(combat.hand) ? combat.hand.map((card: CombatCardState) => card.id) : [],
    handPlayable: Array.isArray(combat.hand) ? combat.hand.map((card: CombatCardState) => Boolean(card.isPlayable)) : [],
    menuItemIds: Array.isArray(state.menuItems) ? state.menuItems.map((item) => item.id) : [],
    drawPileCount: combat.drawPileCount ?? null,
    discardPileCount: combat.discardPileCount ?? null,
    exhaustPileCount: combat.exhaustPileCount ?? null,
    selectionMode: combat.selectionMode ?? null,
    selectionPrompt: combat.selectionPrompt ?? null,
    creatureIntents: Array.isArray(combat.creatures)
      ? combat.creatures.map((creature: CreatureState) => ({
          id: creature.id,
          hp: creature.currentHp ?? null,
          block: creature.block ?? null,
          intents: Array.isArray(creature.intents)
            ? creature.intents.map((intent) => ({
                kind: intent.kind,
                label: intent.label,
                targets: intent.targets ?? [],
              }))
            : [],
        }))
      : [],
  });
}

export function isCombatDisplayStable(state: DisplayState | null | undefined, { quietPeriodMs: _quietPeriodMs = 500 }: { quietPeriodMs?: number } = {}): boolean {
  if (!isCombatStateSettled(state)) {
    return false;
  }

  const combat = state?.combat;
  if (!combat) {
    return false;
  }

  if (combat.handAnimationActive === true) {
    return false;
  }

  if ((combat.pendingHandHolderCount ?? 0) > 0) {
    return false;
  }

  if (combat.cardPlayInProgress === true && !hasStickyCombatPlayFlagFallback(state)) {
    return false;
  }

  return true;
}

export function detectCombatCostChanges(beforeState: DisplayState | null | undefined, afterState: DisplayState | null | undefined): CombatCostChange[] {
  if (!isCombatLikeScreen(beforeState?.screenType) || !isCombatLikeScreen(afterState?.screenType)) {
    return [];
  }

  const previousState = beforeState as DisplayState;
  const nextState = afterState as DisplayState;
  const beforeHand = new Map((previousState.combat?.hand ?? []).map((card) => [card.id, card]));
  const afterHand = nextState.combat?.hand ?? [];

  return afterHand
    .map((card) => {
      const previous = beforeHand.get(card.id);
      if (!previous) {
        return null;
      }

      const beforeCost = previous.costText ?? null;
      const afterCost = card.costText ?? null;
      if (beforeCost === afterCost) {
        return null;
      }

      return {
        cardId: card.id,
        title: card.title ?? null,
        beforeCost,
        afterCost,
      } satisfies CombatCostChange;
    })
    .filter((value): value is CombatCostChange => value !== null);
}
