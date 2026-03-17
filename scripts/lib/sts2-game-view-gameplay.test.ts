import test from "node:test";
import assert from "node:assert/strict";

import { buildGameplayView } from "./sts2-game-view.ts";
import type { RelicState } from "./types.ts";

function expectDefined<T>(value: T): NonNullable<T> {
  assert.notEqual(value, null);
  assert.notEqual(value, undefined);
  return value as NonNullable<T>;
}

function expectRelic(value: string | RelicState): RelicState {
  assert.equal(typeof value, "object");
  return value as RelicState;
}

test("buildGameplayView hides admin noise and surfaces relic details only on demand", () => {
  const state = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T12:00:00.000Z",
    topBar: {
      currentHp: 61,
      maxHp: 86,
      gold: 99,
      buttons: [{ id: "map", enabled: true, selected: false }],
    },
    relics: [
      { id: "BurningBlood", label: "Burning Blood", description: "Heal 6 HP.", count: null, status: "Active" },
      { id: "Pomander", label: "Pomander", description: "Upgrade a card.", count: 3, status: "Active" },
    ],
    actions: ["combat.end_turn"],
    combat: {
      roundNumber: 4,
      currentSide: "Player",
      energy: 3,
      hand: [],
      potions: [],
      creatures: [],
      canEndTurn: true,
    },
  };

  const compact = buildGameplayView(state);
  assert.deepEqual(compact.relics, ["Burning Blood", "Pomander (3)"]);
  assert.equal(expectDefined(compact.topBar).hp, "61/86");
  assert.deepEqual(compact.actions, ["combat.end_turn"]);

  const detailed = buildGameplayView(state, { relics: true });
  assert.equal(expectRelic(expectDefined(detailed.relics[0])).description, "Heal 6 HP.");
  assert.equal(expectRelic(expectDefined(detailed.relics[1])).count, 3);
});

test("buildGameplayView includes deck snapshot and detailed relics for merchant screens", () => {
  const state = {
    screenType: "merchant_inventory",
    updatedAtUtc: "2026-03-17T12:10:00.000Z",
    topBar: {
      currentHp: 86,
      maxHp: 89,
      gold: 393,
      potionSlotCount: 3,
      filledPotionSlotCount: 1,
      emptyPotionSlotCount: 2,
      buttons: [],
    },
    relics: [
      { id: "BurningBlood", label: "Burning Blood", description: "Heal 6 HP.", count: null, status: "Active" },
    ],
    potions: [
      { id: "potion-01:blood-potion", slotIndex: 1, hasPotion: true, title: "Blood Potion", description: "Heal 20%.", usage: "AnyTime", isUsable: true, canDiscard: true },
      { id: "potion-02:empty", slotIndex: 2, hasPotion: false, title: "Empty Slot", description: null, usage: null, isUsable: false, canDiscard: false },
      { id: "potion-03:empty", slotIndex: 3, hasPotion: false, title: "Empty Slot", description: null, usage: null, isUsable: false, canDiscard: false },
    ],
    menuItems: [{ id: "merchant.buy:1", label: "Lantern", description: "Start each combat with 1 extra energy.", enabled: true, selected: false }],
    cardBrowse: {
      kind: "deck_snapshot",
      title: "Current Deck",
      pileType: "Deck",
      cardCount: 2,
      canClose: false,
      cards: [
        { id: "c1", title: "Strike", costText: "1", upgraded: false, description: "Deal 6 damage." },
        { id: "c2", title: "Bash+", costText: "2", upgraded: true, description: "Deal 10 damage." },
      ],
    },
    actions: ["merchant.buy:1", "merchant.close"],
  };

  const view = buildGameplayView(state);
  assert.equal(expectRelic(expectDefined(view.relics[0])).description, "Heal 6 HP.");
  assert.equal(expectDefined(view.potions[0]).title, "Blood Potion");
  assert.equal(expectDefined(view.potions[1]).occupied, false);
  assert.equal(expectDefined(expectDefined(view.topBar).potionSlots).total, 3);
  assert.equal(expectDefined(expectDefined(view.cardBrowse).cards[1]).upgraded, true);
  assert.equal(expectDefined(expectDefined(view.menuItems)[0]).label, "Lantern");
});

test("buildGameplayView preserves readable combat intent summaries", () => {
  const state = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T12:12:00.000Z",
    topBar: { currentHp: 55, maxHp: 80, gold: 21, buttons: [] },
    relics: [],
    potions: [],
    actions: [],
    combat: {
      roundNumber: 3,
      currentSide: "Player",
      energy: 3,
      hand: [],
      potions: [],
      canEndTurn: true,
      creatures: [
        {
          id: "enemy-1",
          name: "Soul Fysh",
          side: "Enemy",
          currentHp: 122,
          maxHp: 122,
          block: 0,
          intents: [
            {
              kind: "SingleAttackIntent",
              label: "18",
              title: "Heavy Slam",
              description: "Deal 18 damage.",
              summary: "18 damage",
              targets: ["player"],
            },
          ],
          powers: [{ title: "Intangible", amount: 1 }],
        },
      ],
    },
  };

  const view = buildGameplayView(state);
  assert.equal(expectDefined(expectDefined(expectDefined(view.combat).creatures[0]).intents[0]).summary, "18 damage");
  assert.equal(expectDefined(expectDefined(expectDefined(view.combat).creatures[0]).intents[0]).title, "Heavy Slam");
  assert.equal(expectDefined(expectDefined(view.combat).creatures[0]).powers[0]?.title, "Intangible");
});

test("buildGameplayView preserves card reward alternatives like skip", () => {
  const state = {
    screenType: "rewards_screen",
    updatedAtUtc: "2026-03-17T12:20:00.000Z",
    topBar: { currentHp: 44, maxHp: 80, gold: 120, buttons: [] },
    relics: [],
    potions: [],
    actions: ["rewards.claim:skip"],
    menuItems: [
      { id: "rewards.claim:card-1", label: "Battle Trance", description: "Draw 3 cards.", enabled: true, selected: false },
      { id: "rewards.claim:skip", label: "Skip", description: "Take nothing.", enabled: true, selected: false },
    ],
  };

  const view = buildGameplayView(state);
  assert.equal(expectDefined(expectDefined(view.menuItems)[1]).label, "Skip");
  assert.deepEqual(view.actions, ["rewards.claim:skip"]);
});

test("buildGameplayView summarizes run history without admin noise", () => {
  const state = {
    screenType: "run_history",
    updatedAtUtc: "2026-03-17T12:30:00.000Z",
    topBar: { currentHp: 0, maxHp: 0, gold: 0, buttons: [] },
    relics: [],
    potions: [],
    actions: ["run_history.next"],
    menuItems: [{ id: "run_history.next", label: "Next", description: null, enabled: true, selected: false }],
    runHistory: {
      fileName: "2026-03-17-ironclad-run-003",
      selectedIndex: 0,
      runCount: 1,
      canGoPrevious: false,
      canGoNext: false,
      characterId: "ironclad",
      ascension: 0,
      seed: "ABC123",
      gameMode: "standard",
      buildId: "dev",
      win: false,
      wasAbandoned: false,
      killedByEncounterId: "Queen",
      killedByEventId: null,
      runTimeSeconds: 3600,
      startTimeUnixSeconds: 1234567890,
      floorReached: 48,
      currentHp: 0,
      maxHp: 92,
      currentGold: 12,
      potionSlotCount: 3,
      floors: [
        {
          floor: 48,
          mapPointType: "Boss",
          currentHp: 0,
          maxHp: 92,
          currentGold: 12,
          damageTaken: 19,
          hpHealed: 0,
          goldGained: 0,
          goldSpent: 0,
          rooms: [{ roomType: "Boss", modelId: "Queen", turnsTaken: 7, monsterIds: ["Queen"] }],
          cardsGained: [{ title: "Feed" }],
          cardsRemoved: [{ title: "Strike" }],
          cardsTransformed: [{ originalCard: { title: "Defend" }, finalCard: { title: "Uppercut" } }],
          upgradedCards: ["Shockwave+"],
          downgradedCards: [],
          boughtRelics: ["Mummified Hand"],
          boughtPotions: ["Blood Potion"],
          potionUsed: ["Blood Potion"],
          potionDiscarded: [],
          restSiteChoices: ["Smith"],
          cardChoices: [{ label: "Feed", picked: true }],
          relicChoices: [{ label: "Mummified Hand", picked: true }],
          potionChoices: [{ label: "Blood Potion", picked: true }],
          ancientChoices: [{ label: "Skip", picked: true }],
          eventChoices: ["Tinker Time -> Curious"],
        },
      ],
      deck: [{ id: "feed", title: "Feed", costText: "1", upgraded: false, count: 1, floorsAdded: [14], description: "Gain max HP." }],
      relics: [{ id: "BurningBlood", label: "Burning Blood", description: "Heal 6 HP.", count: null, status: "Active" }],
    },
  };

  const view = buildGameplayView(state);
  assert.equal(expectDefined(view.runHistory).fileName, "2026-03-17-ironclad-run-003");
  assert.equal(expectDefined(view.runHistory).hp, "0/92");
  assert.equal(expectDefined(expectDefined(expectDefined(view.runHistory).floors[0]).cardsTransformed[0]).to, "Uppercut");
  assert.equal(expectDefined(expectDefined(view.runHistory).relics[0]).label, "Burning Blood");
});
