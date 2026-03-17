import type {
  CombatActionStateView,
  CombatCardState,
  CombatCardView,
  CombatCostChange,
  CombatState,
  CombatViewData,
  CreatureIntentState,
  CreatureState,
  CreatureView,
  DisplayState,
  PotionState,
  PotionView,
} from './types.ts';

export function summarizeCombatCard(card: CombatCardState): CombatCardView {
  return {
    id: card.id,
    title: card.title,
    cost: card.costText ?? null,
    description: card.description ?? null,
    playable: card.isPlayable,
    upgraded: card.upgraded,
    affliction: card.affliction ? {
      kind: card.affliction.kind,
      type: card.affliction.typeName ?? null,
      title: card.affliction.title ?? null,
      description: card.affliction.description ?? null,
      extraCardText: card.affliction.extraCardText ?? null,
      amount: card.affliction.amount ?? null,
      status: card.affliction.status ?? null,
      overlayPath: card.affliction.overlayPath ?? null,
      glowsGold: card.affliction.glowsGold ?? null,
      glowsRed: card.affliction.glowsRed ?? null,
    } : null,
    enchantment: card.enchantment ? {
      kind: card.enchantment.kind,
      type: card.enchantment.typeName ?? null,
      title: card.enchantment.title ?? null,
      description: card.enchantment.description ?? null,
      extraCardText: card.enchantment.extraCardText ?? null,
      amount: card.enchantment.amount ?? null,
      status: card.enchantment.status ?? null,
      overlayPath: card.enchantment.overlayPath ?? null,
      glowsGold: card.enchantment.glowsGold ?? null,
      glowsRed: card.enchantment.glowsRed ?? null,
    } : null,
    unplayable: card.unplayable ? {
      reason: card.unplayable.reason ?? null,
      preventerType: card.unplayable.preventerType ?? null,
      preventerTitle: card.unplayable.preventerTitle ?? null,
      preventerDescription: card.unplayable.preventerDescription ?? null,
    } : null,
    glowsGold: card.glowsGold ?? false,
    glowsRed: card.glowsRed ?? false,
    targets: card.validTargetIds ?? [],
  };
}

export function summarizeCostChange(change: CombatCostChange): CombatCostChange {
  return {
    cardId: change.cardId,
    title: change.title ?? null,
    beforeCost: change.beforeCost ?? null,
    afterCost: change.afterCost ?? null,
  };
}

export function summarizePotion(potion: PotionState): PotionView {
  return {
    id: potion.id,
    slot: potion.slotIndex ?? null,
    occupied: potion.hasPotion ?? true,
    title: potion.title,
    description: potion.description ?? null,
    usable: potion.isUsable,
    discardable: potion.canDiscard,
    usage: potion.usage ?? null,
    targets: potion.validTargetIds ?? [],
  };
}

export function summarizeCreature(creature: CreatureState): CreatureView {
  return {
    id: creature.id,
    name: creature.name,
    side: creature.side,
    hp: `${creature.currentHp ?? 0}/${creature.maxHp ?? 0}`,
    block: creature.block,
    powers: creature.powers ?? [],
    intents: (creature.intents ?? []).map((intent: CreatureIntentState) => ({
      kind: intent.kind,
      label: intent.label ?? null,
      title: intent.title ?? null,
      description: intent.description ?? null,
      summary: intent.summary ?? null,
      targets: intent.targets ?? [],
    })),
  };
}

export function summarizeCombat(combat: CombatState): CombatViewData {
  return {
    roundNumber: combat.roundNumber ?? null,
    currentSide: combat.currentSide ?? null,
    energy: combat.energy ?? null,
    handIsSettled: combat.handIsSettled ?? null,
    handMeta: combat.handIsSettled == null ? null : {
      active: combat.activeHandCount ?? null,
      total: combat.totalHandCount ?? null,
      pending: combat.pendingHandHolderCount ?? null,
      animating: combat.handAnimationActive ?? null,
      cardPlayInProgress: combat.cardPlayInProgress ?? null,
    },
    piles: {
      draw: combat.drawPileCount ?? null,
      discard: combat.discardPileCount ?? null,
      exhaust: combat.exhaustPileCount ?? null,
    },
    canEndTurn: combat.canEndTurn,
    selectionMode: combat.selectionMode ?? null,
    selectionPrompt: combat.selectionPrompt ?? null,
    hand: (combat.hand ?? []).map(summarizeCombatCard),
    potions: (combat.potions ?? []).map(summarizePotion),
    creatures: (combat.creatures ?? []).map(summarizeCreature),
  };
}

export function summarizeCombatActionState(state: DisplayState | null | undefined): CombatActionStateView | null {
  if (!state) {
    return null;
  }

  if (state.screenType !== 'combat_room'
    && state.screenType !== 'combat_card_select'
    && state.screenType !== 'combat_choice_select') {
    return null;
  }

  const combat = state.combat ?? null;
  if (!combat) {
    return {
      screenType: state.screenType ?? null,
      updatedAtUtc: state.updatedAtUtc ?? null,
      combat: null,
    };
  }

  return {
    screenType: state.screenType ?? null,
    updatedAtUtc: state.updatedAtUtc ?? null,
    combat: {
      roundNumber: combat.roundNumber ?? null,
      currentSide: combat.currentSide ?? null,
      energy: combat.energy ?? null,
      canEndTurn: combat.canEndTurn ?? null,
      selectionMode: combat.selectionMode ?? null,
      selectionPrompt: combat.selectionPrompt ?? null,
      hand: (combat.hand ?? []).map(summarizeCombatCard),
    },
  };
}
