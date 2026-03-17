import { isCombatLikeScreen, isCombatStateSettled, isQuietSinceLastUpdate } from "./command-state-utils.mjs";

// Combat state often mutates across a few animation frames. These helpers
// define what counts as a "settled" frame so command orchestration can wait
// for something readable instead of racing the UI.

export function buildCombatStabilityKey(state) {
  if (!state || !isCombatLikeScreen(state.screenType)) {
    return JSON.stringify({ screenType: state?.screenType ?? null });
  }

  const combat = state.combat ?? {};
  return JSON.stringify({
    screenType: state.screenType,
    roundNumber: combat.roundNumber ?? null,
    currentSide: combat.currentSide ?? null,
    energy: combat.energy ?? null,
    handIds: Array.isArray(combat.hand) ? combat.hand.map((card) => card.id) : [],
    handPlayable: Array.isArray(combat.hand) ? combat.hand.map((card) => Boolean(card.isPlayable)) : [],
    menuItemIds: Array.isArray(state.menuItems) ? state.menuItems.map((item) => item.id) : [],
    drawPileCount: combat.drawPileCount ?? null,
    discardPileCount: combat.discardPileCount ?? null,
    exhaustPileCount: combat.exhaustPileCount ?? null,
    selectionMode: combat.selectionMode ?? null,
    selectionPrompt: combat.selectionPrompt ?? null,
    creatureIntents: Array.isArray(combat.creatures)
      ? combat.creatures.map((creature) => ({
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

export function isCombatDisplayStable(state, { quietPeriodMs = 500 } = {}) {
  if (!isCombatStateSettled(state)) {
    return false;
  }

  return isQuietSinceLastUpdate(state, quietPeriodMs);
}

export function detectCombatCostChanges(beforeState, afterState) {
  if (!isCombatLikeScreen(beforeState?.screenType) || !isCombatLikeScreen(afterState?.screenType)) {
    return [];
  }

  const beforeHand = new Map((beforeState.combat?.hand ?? []).map((card) => [card.id, card]));
  const afterHand = afterState.combat?.hand ?? [];

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
      };
    })
    .filter(Boolean);
}
