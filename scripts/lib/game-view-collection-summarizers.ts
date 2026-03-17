import type {
  CardBrowseState,
  CardBrowseView,
  CombatCardState,
  CombatCardView,
  MapPointState,
  MapState,
  MapView,
  RunHistoryCardRecord,
  RunHistoryChoice,
  RunHistoryDeckCardView,
  RunHistoryFloor,
  RunHistoryFloorRoom,
  RunHistoryFloorView,
  RunHistoryState,
  RunHistoryView,
} from './types.ts';
import { summarizeRelic } from './game-view-common-summarizers.ts';

export function summarizeMap(map: MapState): MapView {
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

export function summarizeCardBrowse(cardBrowse: CardBrowseState): CardBrowseView {
  return {
    kind: cardBrowse.kind,
    title: cardBrowse.title,
    pileType: cardBrowse.pileType ?? null,
    cardCount: cardBrowse.cardCount,
    canClose: cardBrowse.canClose,
    cards: (cardBrowse.cards ?? []).map((card: CombatCardState): CombatCardView => ({
      id: card.id,
      title: card.title,
      cost: card.costText ?? null,
      upgraded: card.upgraded,
      description: card.description ?? null,
      playable: card.isPlayable,
      affliction: null,
      enchantment: null,
      unplayable: null,
      glowsGold: card.glowsGold ?? false,
      glowsRed: card.glowsRed ?? false,
      targets: card.validTargetIds ?? [],
    })),
  };
}

function summarizeRunHistoryFloor(floor: RunHistoryFloor): RunHistoryFloorView {
  return {
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
  };
}

function summarizeRunHistoryDeckCard(card: RunHistoryCardRecord): RunHistoryDeckCardView {
  return {
    id: card.id,
    title: card.title,
    cost: card.costText ?? null,
    upgraded: card.upgraded ?? false,
    count: card.count ?? 1,
    floorsAdded: card.floorsAdded ?? [],
    description: card.description ?? null,
  };
}

export function summarizeRunHistory(runHistory: RunHistoryState): RunHistoryView {
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
    floors: (runHistory.floors ?? []).map(summarizeRunHistoryFloor),
    deck: (runHistory.deck ?? []).map(summarizeRunHistoryDeckCard),
    relics: (runHistory.relics ?? []).map(summarizeRelic),
  };
}
