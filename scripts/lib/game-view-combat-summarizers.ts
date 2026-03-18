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
import type { ViewMode } from './view-options.ts';

function summarizeOverlay(
  overlay: CombatCardState['affliction'] | CombatCardState['enchantment'],
  mode: Exclude<ViewMode, 'full'>,
): CombatCardView['affliction'] {
  if (!overlay) {
    return null;
  }

  const compact = mode === 'easy';
  return {
    kind: overlay.kind,
    type: overlay.typeName ?? null,
    title: overlay.title ?? null,
    description: compact ? null : (overlay.description ?? null),
    extraCardText: compact ? null : (overlay.extraCardText ?? null),
    amount: overlay.amount ?? null,
    status: overlay.status ?? null,
    overlayPath: compact ? null : (overlay.overlayPath ?? null),
    glowsGold: overlay.glowsGold ?? null,
    glowsRed: overlay.glowsRed ?? null,
  };
}

export function summarizeCombatCard(card: CombatCardState, mode: Exclude<ViewMode, 'full'> = 'hard'): CombatCardView {
  const compact = mode === 'easy';

  return {
    id: card.id,
    title: card.title,
    cost: card.costText ?? null,
    description: compact ? null : (card.description ?? null),
    playable: card.isPlayable,
    upgraded: card.upgraded,
    affliction: summarizeOverlay(card.affliction, mode),
    enchantment: summarizeOverlay(card.enchantment, mode),
    unplayable: card.unplayable ? {
      reason: card.unplayable.reason ?? null,
      preventerType: card.unplayable.preventerType ?? null,
      preventerTitle: compact ? null : (card.unplayable.preventerTitle ?? null),
      preventerDescription: compact ? null : (card.unplayable.preventerDescription ?? null),
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

export function summarizePotion(potion: PotionState, mode: Exclude<ViewMode, 'full'> = 'hard'): PotionView {
  const compact = mode === 'easy';

  return {
    id: potion.id,
    slot: potion.slotIndex ?? null,
    occupied: potion.hasPotion ?? true,
    title: potion.title,
    description: compact ? null : (potion.description ?? null),
    usable: potion.isUsable,
    discardable: compact ? undefined : potion.canDiscard,
    usage: compact ? null : (potion.usage ?? null),
    targets: compact ? [] : (potion.validTargetIds ?? []),
  };
}

export function summarizeCreature(creature: CreatureState, mode: Exclude<ViewMode, 'full'> = 'hard'): CreatureView {
  const compact = mode === 'easy';

  return {
    id: creature.id,
    name: creature.name,
    side: creature.side,
    hp: `${creature.currentHp ?? 0}/${creature.maxHp ?? 0}`,
    block: creature.block,
    powers: compact
      ? (creature.powers ?? []).map((power) => ({
        ...('id' in power && power.id != null ? { id: power.id } : {}),
        ...('label' in power && power.label != null ? { label: power.label } : {}),
        ...(power.title != null ? { title: power.title } : {}),
        amount: power.amount ?? null,
      }))
      : (creature.powers ?? []),
    intents: (creature.intents ?? []).map((intent: CreatureIntentState) => ({
      kind: intent.kind,
      label: intent.label ?? null,
      title: intent.title ?? null,
      description: compact ? null : (intent.description ?? null),
      summary: intent.summary ?? null,
      targets: compact ? [] : (intent.targets ?? []),
    })),
  };
}

export function summarizeCombat(combat: CombatState, mode: Exclude<ViewMode, 'full'> = 'hard'): CombatViewData {
  const compact = mode === 'easy';

  return {
    roundNumber: combat.roundNumber ?? null,
    currentSide: combat.currentSide ?? null,
    energy: combat.energy ?? null,
    handIsSettled: compact ? null : (combat.handIsSettled ?? null),
    handMeta: compact || combat.handIsSettled == null ? null : {
      active: combat.activeHandCount ?? null,
      total: combat.totalHandCount ?? null,
      pending: combat.pendingHandHolderCount ?? null,
      animating: combat.handAnimationActive ?? null,
      cardPlayInProgress: combat.cardPlayInProgress ?? null,
    },
    piles: {
      draw: compact ? null : (combat.drawPileCount ?? null),
      discard: compact ? null : (combat.discardPileCount ?? null),
      exhaust: compact ? null : (combat.exhaustPileCount ?? null),
    },
    canEndTurn: combat.canEndTurn,
    selectionMode: combat.selectionMode ?? null,
    selectionPrompt: combat.selectionPrompt ?? null,
    hand: (combat.hand ?? []).map((card) => summarizeCombatCard(card, mode)),
    potions: (combat.potions ?? [])
      .map((potion) => summarizePotion(potion, mode))
      .filter((potion) => !compact || potion.occupied),
    creatures: (combat.creatures ?? []).map((creature) => summarizeCreature(creature, mode)),
  };
}

export function summarizeCombatActionState(
  state: DisplayState | null | undefined,
  mode: Exclude<ViewMode, 'full'> = 'hard',
): CombatActionStateView | null {
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
      hand: (combat.hand ?? []).map((card) => summarizeCombatCard(card, mode)),
    },
  };
}
