import test from "node:test";
import assert from "node:assert/strict";

import { buildCommandView, buildGameplayView } from "../lib/sts2-game-view.ts";
import type { RelicState } from "../lib/types.ts";

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
  assert.equal(compact.actions, undefined);

  const detailed = buildGameplayView(state, { relics: true });
  assert.equal(expectRelic(expectDefined(detailed.relics[0])).description, "Heal 6 HP.");
  assert.equal(expectRelic(expectDefined(detailed.relics[1])).count, 3);

  const hard = buildGameplayView(state, { hard: true });
  assert.deepEqual(hard.choices, []);
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

  const view = buildGameplayView(state, { hard: true });
  assert.equal(expectRelic(expectDefined(view.relics[0])).description, "Heal 6 HP.");
  assert.equal(expectDefined(view.potions[0]).title, "Blood Potion");
  assert.equal(expectDefined(view.potions[1]).occupied, false);
  assert.equal(expectDefined(expectDefined(view.topBar).potionSlots).total, 3);
  assert.equal(expectDefined(expectDefined(view.cardBrowse).cards[1]).upgraded, true);
  assert.equal(expectDefined(expectDefined(view.choices)[0]).action, "merchant.buy:1");
  assert.equal(expectDefined(expectDefined(view.choices)[0]).label, "Lantern");
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

  const view = buildGameplayView(state, { hard: true });
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
    actions: ["rewards.claim:card-1", "rewards.claim:skip"],
    menuItems: [
      { id: "rewards.claim:card-1", label: "Battle Trance", description: "Draw 3 cards.", enabled: true, selected: false },
      { id: "rewards.claim:skip", label: "Skip", description: "Take nothing.", enabled: true, selected: false },
    ],
  };

  const view = buildGameplayView(state, { hard: true });
  assert.equal(expectDefined(expectDefined(view.choices)[0]).action, "rewards.claim:card");
  assert.equal(expectDefined(expectDefined(view.choices)[1]).label, "Skip");
  assert.equal(expectDefined(expectDefined(view.choices)[1]).action, "rewards.claim:skip");
});

test("buildGameplayView dedupes equivalent card reward skip actions", () => {
  const state = {
    screenType: "card_reward_selection",
    updatedAtUtc: "2026-03-17T12:21:00.000Z",
    topBar: { currentHp: 44, maxHp: 80, gold: 120, buttons: [] },
    relics: [],
    potions: [],
    actions: ["card_reward.select:reward-card-1", "card_reward.alternate:Skip", "card_reward.skip"],
    menuItems: [
      { id: "reward-card-1", label: "Shrug It Off", description: "Gain 8 Block. Draw 1 card.", enabled: true, selected: false },
      { id: "Skip", label: "Skip", description: "Hotkey: ui_cancel", enabled: true, selected: false },
    ],
    notes: ["Card reward screen is active."],
  };

  const view = buildGameplayView(state, { easy: true });
  assert.deepEqual(expectDefined(view.choices).map((choice) => choice.action), [
    "card_reward.select:reward-card-1",
    "card_reward.skip",
  ]);
  assert.deepEqual(expectDefined(view.choices).map((choice) => choice.label), [
    "Shrug It Off",
    "Skip",
  ]);
});

test("buildCommandView keeps next actions, notes, and menu items in easy mode", () => {
  const result = {
    ok: true,
    actionCount: 1,
    results: [
      { action: "combat.play:feed", id: "cmd-1", ackStatus: "completed", screenType: "rewards_screen" },
    ],
    state: {
      screenType: "rewards_screen",
      updatedAtUtc: "2026-03-17T12:22:00.000Z",
      topBar: { currentHp: 44, maxHp: 80, gold: 120, buttons: [] },
      relics: [],
      potions: [],
      actions: ["rewards.claim:gold", "rewards.claim:card", "rewards.proceed"],
      notes: ["Rewards visible: 2."],
      menuItems: [
        { id: "rewards.claim:gold", label: "13 Gold", description: "13 Gold", enabled: true, selected: false },
        { id: "rewards.claim:card", label: "Add a card to your deck.", description: "Add a card to your deck.", enabled: true, selected: false },
      ],
    },
  };

  const view = buildCommandView(result, { easy: true });
  assert.deepEqual(expectDefined(view.state.choices).map((choice) => choice.action), ["rewards.claim:gold", "rewards.claim:card", "proceed"]);
  assert.equal(expectDefined(view.state.notes)[0], "Rewards visible: 2.");
  assert.equal(expectDefined(expectDefined(view.state.choices)[1]).label, "Add a card to your deck.");
});

test("buildCommandView keeps treasure relic descriptions in easy mode", () => {
  const result = {
    ok: true,
    actionCount: 1,
    results: [
      { action: "treasure.open", id: "cmd-1", ackStatus: "completed", screenType: "treasure_relic_selection" },
    ],
    state: {
      screenType: "treasure_relic_selection",
      updatedAtUtc: "2026-03-17T12:22:00.000Z",
      topBar: { currentHp: 44, maxHp: 80, gold: 120, buttons: [] },
      relics: [],
      potions: [],
      actions: ["treasure_relic.choose:relic-0-BowlerHat"],
      menuItems: [
        {
          id: "relic-0-BowlerHat",
          label: "Bowler Hat",
          description: "Gain 20% additional Gold.",
          enabled: true,
          selected: false,
        },
      ],
      notes: ["Choose one visible relic to continue the chest flow."],
    },
  };

  const view = buildCommandView(result, { easy: true });
  assert.deepEqual(expectDefined(view.state.choices).map((choice) => choice.action), ["treasure_relic.choose:relic-0-BowlerHat"]);
  assert.equal(expectDefined(expectDefined(view.state.choices)[0]).label, "Bowler Hat");
  assert.equal(expectDefined(expectDefined(view.state.choices)[0]).description, "Gain 20% additional Gold.");
  assert.equal(view.state.notes, undefined);
});

test("buildCommandView keeps easy command output compact on non-choice screens", () => {
  const result = {
    ok: true,
    actionCount: 1,
    results: [
      { action: "rewards.proceed", id: "cmd-1", ackStatus: "completed", screenType: "map_screen" },
    ],
    state: {
      screenType: "map_screen",
      updatedAtUtc: "2026-03-17T12:23:00.000Z",
      topBar: { currentHp: 44, maxHp: 80, gold: 120, buttons: [] },
      relics: [],
      potions: [],
      actions: ["map.travel:3,1"],
      notes: ["Map screen is open."],
      menuItems: [{ id: "travel-1", label: "3,1", description: null, enabled: true, selected: false }],
      map: {
        visible: true,
        travelEnabled: true,
        traveling: false,
        points: [
          { id: "3,0", col: 3, row: 0, type: "Ancient", state: "Traveled", travelable: false, canModify: true },
          { id: "3,1", col: 3, row: 1, type: "Monster", state: "Travelable", travelable: true, canModify: true },
        ],
      },
    },
  };

  const view = buildCommandView(result, { easy: true });
  assert.deepEqual(expectDefined(view.state.choices).map((choice) => choice.action), ["map.travel:3,1"]);
  assert.equal(view.state.notes, undefined);
  assert.equal(view.state.choices?.[0]?.description, "Monster");
});

test("buildGameplayView shows a compact full-map summary on map screens", () => {
  const state = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T12:24:00.000Z",
    topBar: { currentHp: 80, maxHp: 80, gold: 99, buttons: [] },
    relics: [],
    potions: [],
    actions: ["map.travel:2,1", "map.travel:4,1"],
    map: {
      visible: true,
      travelEnabled: true,
      traveling: false,
      points: [
        { id: "3,0", col: 3, row: 0, type: "Ancient", state: "Traveled", travelable: false, canModify: true },
        { id: "2,1", col: 2, row: 1, type: "Monster", state: "Travelable", travelable: true, canModify: true },
        { id: "4,1", col: 4, row: 1, type: "Monster", state: "Travelable", travelable: true, canModify: true },
        { id: "6,2", col: 6, row: 2, type: "Shop", state: "Untravelable", travelable: false, canModify: true },
      ],
    },
  };

  const view = buildGameplayView(state, { hard: true });
  assert.equal(expectDefined(view.map).current?.coord, "3,0");
  assert.deepEqual(expectDefined(view.map).travelablePoints.map((point) => point.coord), ["2,1", "4,1"]);
  assert.equal(expectDefined(view.map).rows.length, 3);
  assert.equal(expectDefined(view.map).pointCount, 4);
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

  const view = buildGameplayView(state, { hard: true });
  assert.equal(expectDefined(view.runHistory).fileName, "2026-03-17-ironclad-run-003");
  assert.equal(expectDefined(view.runHistory).hp, "0/92");
  assert.equal(expectDefined(expectDefined(expectDefined(view.runHistory).floors[0]).cardsTransformed[0]).to, "Uppercut");
  assert.equal(expectDefined(expectDefined(view.runHistory).relics[0]).label, "Burning Blood");
});

test("buildGameplayView easy mode strips noisy collections and empty potion slots", () => {
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
      ],
    },
    actions: ["merchant.buy:1", "merchant.close"],
  };

  const view = buildGameplayView(state, { easy: true });
  assert.equal(expectDefined(view.choices).length, 2);
  assert.equal(expectDefined(view.potions).length, 1);
  assert.equal(expectDefined(expectDefined(view.cardBrowse).cards[0]).description, null);
});

test("buildGameplayView easy deck view focuses on the deck list", () => {
  const state = {
    screenType: "deck_view",
    updatedAtUtc: "2026-03-17T12:41:00.000Z",
    topBar: {
      currentHp: 87,
      maxHp: 90,
      gold: 282,
      potionSlotCount: 3,
      filledPotionSlotCount: 2,
      emptyPotionSlotCount: 1,
      buttons: [],
    },
    relics: [
      { id: "BurningBlood", label: "Burning Blood", description: "Heal 6 HP.", count: null, status: "Active" },
    ],
    potions: [
      { id: "potion-01:strength-potion", slotIndex: 1, hasPotion: true, title: "Strength Potion", description: "Gain 2 Strength.", usage: "CombatOnly", isUsable: false, canDiscard: true },
      { id: "potion-02:energy-potion", slotIndex: 2, hasPotion: true, title: "Energy Potion", description: "Gain 2 Energy.", usage: "CombatOnly", isUsable: false, canDiscard: true },
    ],
    actions: ["deck_view.sort:obtained", "top_bar.deck"],
    menuItems: [
      { id: "obtained", label: "Obtained", description: "Sort deck by obtained.", enabled: true, selected: false },
    ],
    cardBrowse: {
      kind: "deck_view",
      title: "Deck",
      pileType: "Deck",
      cardCount: 1,
      canClose: true,
      cards: [
        { id: "c1", title: "Strike", costText: "1", upgraded: false, description: "Deal 6 damage.", glowsGold: false, glowsRed: false },
      ],
    },
  };

  const view = buildGameplayView(state, { easy: true });
  assert.equal(view.relics, undefined);
  assert.equal(view.potions, undefined);
  assert.equal(expectDefined(expectDefined(view.cardBrowse).cards[0]).description, null);
  assert.equal(expectDefined(expectDefined(view.cardBrowse).cards[0]).glowsGold, undefined);
  assert.equal(expectDefined(expectDefined(view.cardBrowse).cards[0]).glowsRed, undefined);
  assert.equal(expectDefined(view.topBar).hp, "87/90");
});

test("buildGameplayView disambiguates duplicate card-select labels while preserving exact actions", () => {
  const state = {
    screenType: "deck_card_select",
    updatedAtUtc: "2026-03-17T12:40:00.000Z",
    topBar: { currentHp: 50, maxHp: 80, gold: 120, buttons: [] },
    relics: [],
    potions: [],
    actions: [
      "deck_card_select.select:strike-01",
      "deck_card_select.select:strike-02",
      "deck_card_select.select:strike-plus-01",
    ],
    menuItems: [
      { id: "strike-01", label: "Strike", description: "Deal 6 damage.", enabled: true, selected: false },
      { id: "strike-02", label: "Strike", description: "Deal 6 damage.", enabled: true, selected: false },
      { id: "strike-plus-01", label: "Strike+", description: "Deal 9 damage.", enabled: true, selected: false },
    ],
    notes: ["Prompt: Choose a card to remove."],
  };

  const view = buildGameplayView(state, { easy: true });
  assert.deepEqual(expectDefined(view.choices).map((choice) => choice.action), [
    "deck_card_select.select:strike-01",
    "deck_card_select.select:strike-02",
    "deck_card_select.select:strike-plus-01",
  ]);
  assert.deepEqual(expectDefined(view.choices).map((choice) => choice.label), [
    "Strike [1/2]",
    "Strike [2/2]",
    "Strike+",
  ]);
});

test("buildGameplayView uses surfaced potion metadata for potion choices", () => {
  const state = {
    screenType: "event",
    updatedAtUtc: "2026-03-17T12:45:00.000Z",
    topBar: { currentHp: 60, maxHp: 80, gold: 120, buttons: [] },
    relics: [],
    potions: [
      {
        id: "potion-01:strength-potion",
        slotIndex: 1,
        hasPotion: true,
        title: "Strength Potion",
        description: "Gain 2 Strength.",
        usage: "CombatOnly",
        isUsable: false,
        canDiscard: true,
      },
    ],
    actions: ["potions.discard:potion-01:strength-potion"],
    eventTitle: "Orobas",
    eventDescription: "Proceed.",
  };

  const view = buildGameplayView(state, { hard: true });
  assert.deepEqual(expectDefined(view.choices), [
    {
      action: "potions.discard:potion-01:strength-potion",
      label: "Strength Potion",
      description: "Gain 2 Strength.",
    },
  ]);
});
