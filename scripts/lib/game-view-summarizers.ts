import type {
  CardBrowseState,
  CharacterState,
  CombatCardState,
  CombatCostChange,
  CombatState,
  CreatureIntentState,
  CreatureState,
  DisplayState,
  MapPointState,
  MapState,
  MenuItemState,
  PotionState,
  ProfileState,
  RelicState,
  RunHistoryCardRecord,
  RunHistoryChoice,
  RunHistoryFloor,
  RunHistoryFloorRoom,
  RunHistoryState,
} from './types.ts';

type AnyRecord = Record<string, any>;

// This module stays intentionally pure: it only reshapes exporter payloads into
// compact, human-readable summaries. Screen-level decisions belong in
// sts2-game-view.ts.

export function summarizeButton(button: { id: string; enabled?: boolean; selected?: boolean }): { id: string; enabled: boolean | undefined; selected: boolean | undefined } {
  return {
    id: button.id,
    enabled: button.enabled,
    selected: button.selected,
  };
}

export function summarizeRelicLabel(relic: RelicState): string {
  return relic.count == null ? relic.label : `${relic.label} (${relic.count})`;
}

export function summarizeRelic(relic: RelicState): RelicState {
  return {
    id: relic.id,
    label: relic.label,
    description: relic.description ?? null,
    count: relic.count ?? null,
    status: relic.status ?? null,
  };
}

export function summarizeMenuItem(item: MenuItemState): Required<Pick<MenuItemState, 'id'>> & {
  label: string | undefined;
  description: string | null;
  enabled: boolean | undefined;
  selected: boolean | undefined;
} {
  return {
    id: item.id,
    label: item.label,
    description: item.description ?? null,
    enabled: item.enabled,
    selected: item.selected,
  };
}

export function summarizeCombatCard(card: CombatCardState): AnyRecord {
  return {
    id: card.id,
    title: card.title,
    cost: card.costText ?? null,
    description: card.description ?? null,
    playable: card.isPlayable,
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

export function summarizePotion(potion: PotionState): AnyRecord {
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

export function summarizeCreature(creature: CreatureState): AnyRecord {
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

export function summarizeCombat(combat: CombatState): AnyRecord {
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

export function summarizeCombatActionState(state: DisplayState | null | undefined): AnyRecord | null {
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

export function summarizeMap(map: MapState): AnyRecord {
  return {
    visible: map.visible,
    travelEnabled: map.travelEnabled,
    traveling: map.traveling,
    points: (map.points ?? []).map((point: MapPointState) => ({
      id: point.id,
      coord: `${point.col},${point.row}`,
      type: point.type,
      state: point.state,
      travelable: point.travelable,
    })),
  };
}

export function summarizeCardBrowse(cardBrowse: CardBrowseState): AnyRecord {
  return {
    kind: cardBrowse.kind,
    title: cardBrowse.title,
    pileType: cardBrowse.pileType ?? null,
    cardCount: cardBrowse.cardCount,
    canClose: cardBrowse.canClose,
    cards: (cardBrowse.cards ?? []).map((card: CombatCardState) => ({
      id: card.id,
      title: card.title,
      cost: card.costText ?? null,
      upgraded: card.upgraded,
      description: card.description ?? null,
    })),
  };
}

export function summarizeRunHistory(runHistory: RunHistoryState): AnyRecord {
  return {
    fileName: runHistory.fileName ?? null,
    selectedIndex: runHistory.selectedIndex ?? null,
    runCount: runHistory.runCount ?? null,
    canGoPrevious: runHistory.canGoPrevious ?? false,
    canGoNext: runHistory.canGoNext ?? false,
    characterId: runHistory.characterId ?? null,
    ascension: runHistory.ascension ?? null,
    seed: runHistory.seed ?? null,
    gameMode: runHistory.gameMode ?? null,
    buildId: runHistory.buildId ?? null,
    win: runHistory.win ?? null,
    wasAbandoned: runHistory.wasAbandoned ?? null,
    killedByEncounterId: runHistory.killedByEncounterId ?? null,
    killedByEventId: runHistory.killedByEventId ?? null,
    runTimeSeconds: runHistory.runTimeSeconds ?? null,
    startTimeUnixSeconds: runHistory.startTimeUnixSeconds ?? null,
    floorReached: runHistory.floorReached ?? null,
    hp: runHistory.currentHp == null || runHistory.maxHp == null
      ? null
      : `${runHistory.currentHp}/${runHistory.maxHp}`,
    gold: runHistory.currentGold ?? null,
    potionSlotCount: runHistory.potionSlotCount ?? null,
    floors: (runHistory.floors ?? []).map((floor: RunHistoryFloor) => ({
      floor: floor.floor,
      mapPointType: floor.mapPointType ?? null,
      hp: floor.currentHp == null || floor.maxHp == null ? null : `${floor.currentHp}/${floor.maxHp}`,
      gold: floor.currentGold ?? null,
      damageTaken: floor.damageTaken ?? null,
      hpHealed: floor.hpHealed ?? null,
      goldGained: floor.goldGained ?? null,
      goldSpent: floor.goldSpent ?? null,
      rooms: (floor.rooms ?? []).map((room: RunHistoryFloorRoom) => ({
        roomType: room.roomType ?? null,
        modelId: room.modelId ?? null,
        turnsTaken: room.turnsTaken ?? null,
        monsterIds: room.monsterIds ?? [],
      })),
      cardsGained: (floor.cardsGained ?? []).map((card: RunHistoryCardRecord) => card.title),
      cardsRemoved: (floor.cardsRemoved ?? []).map((card: RunHistoryCardRecord) => card.title),
      cardsTransformed: (floor.cardsTransformed ?? []).map((entry) => ({
        from: entry.originalCard?.title ?? null,
        to: entry.finalCard?.title ?? null,
      })),
      upgradedCards: floor.upgradedCards ?? [],
      downgradedCards: floor.downgradedCards ?? [],
      boughtRelics: floor.boughtRelics ?? [],
      boughtPotions: floor.boughtPotions ?? [],
      potionUsed: floor.potionUsed ?? [],
      potionDiscarded: floor.potionDiscarded ?? [],
      restSiteChoices: floor.restSiteChoices ?? [],
      cardChoices: (floor.cardChoices ?? []).map((choice: RunHistoryChoice) => ({ label: choice.label, picked: choice.picked })),
      relicChoices: (floor.relicChoices ?? []).map((choice: RunHistoryChoice) => ({ label: choice.label, picked: choice.picked })),
      potionChoices: (floor.potionChoices ?? []).map((choice: RunHistoryChoice) => ({ label: choice.label, picked: choice.picked })),
      ancientChoices: (floor.ancientChoices ?? []).map((choice: RunHistoryChoice) => ({ label: choice.label, picked: choice.picked })),
      eventChoices: floor.eventChoices ?? [],
    })),
    deck: (runHistory.deck ?? []).map((card: RunHistoryCardRecord) => ({
      id: card.id,
      title: card.title,
      cost: card.costText ?? null,
      upgraded: card.upgraded ?? false,
      count: card.count ?? 1,
      floorsAdded: card.floorsAdded ?? [],
      description: card.description ?? null,
    })),
    relics: (runHistory.relics ?? []).map(summarizeRelic),
  };
}

export function summarizeCharacter(character: CharacterState): CharacterState {
  return {
    id: character.id,
    label: character.label,
    isLocked: character.isLocked,
    isRandom: character.isRandom,
    isSelected: character.isSelected,
  };
}

export function summarizeProfile(profile: ProfileState): ProfileState {
  return {
    internalId: profile.internalId,
    displayId: profile.displayId,
    isCurrent: profile.isCurrent,
  };
}
