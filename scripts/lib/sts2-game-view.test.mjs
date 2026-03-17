import test from "node:test";
import assert from "node:assert/strict";

import { buildGameplayView } from "./sts2-game-view.mjs";
import { buildCombatCommandView } from "./sts2-game-view.mjs";
import { buildCombatView } from "./sts2-game-view.mjs";

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
  assert.equal(compact.topBar.hp, "61/86");
  assert.deepEqual(compact.actions, ["combat.end_turn"]);

  const detailed = buildGameplayView(state, { relics: true });
  assert.equal(detailed.relics[0].description, "Heal 6 HP.");
  assert.equal(detailed.relics[1].count, 3);
});

test("buildCombatCommandView falls back to gameplay view when combat actions exit combat", () => {
  const result = {
    ok: true,
    actionCount: 1,
    results: [
      { action: "combat.play:feed", id: "cmd-1", ackStatus: "completed", screenType: "rewards_screen" },
    ],
    state: {
      screenType: "rewards_screen",
      updatedAtUtc: "2026-03-17T12:05:00.000Z",
      actions: ["rewards.proceed"],
      relics: [{ id: "BurningBlood", label: "Burning Blood", description: "Heal.", count: null, status: "Active" }],
      menuItems: [{ id: "reward-1", label: "100 Gold", description: "100 Gold", enabled: true, selected: false }],
      topBar: { currentHp: 54, maxHp: 89, gold: 256, buttons: [] },
    },
  };

  const view = buildCombatCommandView(result);
  assert.equal(view.state.screenType, "rewards_screen");
  assert.deepEqual(view.state.actions, ["rewards.proceed"]);
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
  assert.equal(view.relics[0].description, "Heal 6 HP.");
  assert.equal(view.potions[0].title, "Blood Potion");
  assert.equal(view.potions[0].usable, true);
  assert.equal(view.potions[1].occupied, false);
  assert.deepEqual(view.topBar.potionSlots, { total: 3, filled: 1, empty: 2 });
  assert.equal(view.cardBrowse.kind, "deck_snapshot");
  assert.equal(view.cardBrowse.cardCount, 2);
  assert.equal(view.menuItems[0].label, "Lantern");
});

test("buildGameplayView preserves readable combat intent summaries", () => {
  const state = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T12:20:00.000Z",
    topBar: { currentHp: 77, maxHp: 89, gold: 53, buttons: [] },
    relics: [],
    actions: ["combat.end_turn"],
    combat: {
      roundNumber: 2,
      currentSide: "Player",
      energy: 3,
      hand: [],
      potions: [],
      canEndTurn: true,
      creatures: [
        {
          id: "creature-1",
          name: "Chomper",
          side: "Enemy",
          currentHp: 60,
          maxHp: 60,
          block: 0,
          powers: [],
          intents: [
            {
              kind: "StatusIntent",
              label: "3",
              title: "Strategic",
              description: "This enemy intends to give you 3 Status cards.",
              summary: "Strategic: This enemy intends to give you 3 Status cards.",
              targets: ["creature-0"],
            },
          ],
        },
      ],
    },
  };

  const view = buildGameplayView(state);
  assert.equal(view.combat.creatures[0].intents[0].title, "Strategic");
  assert.equal(
    view.combat.creatures[0].intents[0].summary,
    "Strategic: This enemy intends to give you 3 Status cards.",
  );
});

test("buildGameplayView preserves card reward alternatives like skip", () => {
  const state = {
    screenType: "card_reward_selection",
    updatedAtUtc: "2026-03-17T12:25:00.000Z",
    topBar: { currentHp: 77, maxHp: 89, gold: 53, buttons: [] },
    relics: [],
    actions: [
      "card_reward.select:reward-card-a1",
      "card_reward.alternate:skip",
      "card_reward.skip",
    ],
    menuItems: [
      { id: "reward-card-a1", label: "Anger", description: "Deal 6 damage.", enabled: true, selected: false },
      { id: "skip", label: "Skip", description: "Hotkey: S", enabled: true, selected: false },
    ],
  };

  const view = buildGameplayView(state);
  assert.deepEqual(view.actions, [
    "card_reward.select:reward-card-a1",
    "card_reward.alternate:skip",
    "card_reward.skip",
  ]);
  assert.deepEqual(view.menuItems.map((item) => item.label), ["Anger", "Skip"]);
});

test("buildCombatView supports modal combat card choice overlays", () => {
  const state = {
    screenType: "combat_choice_select",
    updatedAtUtc: "2026-03-17T13:00:00.000Z",
    topBar: { currentHp: 61, maxHp: 86, gold: 87, buttons: [] },
    relics: [{ id: "Lantern", label: "Lantern", description: "Start with 1 extra energy.", count: null, status: "Active" }],
    actions: [
      "combat_choice_select.select:slow-and-low-01",
      "combat_choice_select.skip",
    ],
    menuItems: [
      { id: "slow-and-low-01", label: "Slow and Low", description: "Apply Weak.", enabled: true, selected: false },
    ],
    combat: {
      roundNumber: 3,
      currentSide: "Player",
      energy: 2,
      hand: [],
      potions: [],
      creatures: [],
      canEndTurn: false,
      selectionMode: "choice_selection",
      selectionPrompt: "Choose a Card",
      handIsSettled: true,
    },
  };

  const view = buildCombatView(state);
  assert.equal(view.screenType, "combat_choice_select");
  assert.equal(view.combat.selectionPrompt, "Choose a Card");
  assert.deepEqual(view.menuItems.map((item) => item.id), ["slow-and-low-01"]);
  assert.deepEqual(view.actions, [
    "combat_choice_select.select:slow-and-low-01",
    "combat_choice_select.skip",
  ]);
});

test("buildCombatCommandView surfaces combat cost changes per action", () => {
  const result = {
    ok: true,
    actionCount: 1,
    results: [
      {
        action: "combat.play:pyre",
        id: "cmd-1",
        ackStatus: "completed",
        screenType: "combat_room",
        costChanges: [
          {
            cardId: "unrelenting",
            title: "Unrelenting",
            beforeCost: "2",
            afterCost: "0",
          },
        ],
      },
    ],
    state: {
      screenType: "combat_room",
      updatedAtUtc: "2026-03-17T13:10:00.000Z",
      topBar: { currentHp: 74, maxHp: 89, gold: 122, buttons: [] },
      relics: [],
      actions: ["combat.end_turn"],
      combat: {
        roundNumber: 1,
        currentSide: "Player",
        energy: 2,
        handIsSettled: true,
        hand: [],
        potions: [],
        creatures: [],
        canEndTurn: true,
      },
    },
  };

  const view = buildCombatCommandView(result);
  assert.deepEqual(view.actions[0].costChanges, [
    {
      cardId: "unrelenting",
      title: "Unrelenting",
      beforeCost: "2",
      afterCost: "0",
    },
  ]);
});

test("buildGameplayView surfaces combat card transient states and unplayable causes", () => {
  const state = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T15:30:00.000Z",
    topBar: { currentHp: 73, maxHp: 91, gold: 176, buttons: [] },
    relics: [],
    actions: ["combat.end_turn"],
    combat: {
      roundNumber: 3,
      currentSide: "Player",
      energy: 2,
      handIsSettled: true,
      canEndTurn: true,
      potions: [],
      creatures: [],
      hand: [
        {
          id: "card-bound",
          title: "Uppercut+",
          costText: "2",
          description: "Deal 12 damage.",
          isPlayable: false,
          glowsGold: false,
          glowsRed: false,
          affliction: {
            kind: "affliction",
            typeName: "Bound",
            title: "Bound",
            description: "This card cannot be played normally.",
            extraCardText: "Bound",
            amount: 1,
            status: null,
            overlayPath: "res://bound.png",
            glowsGold: null,
            glowsRed: null,
          },
          enchantment: null,
          unplayable: {
            reason: "BlockedByHook",
            preventerType: "Bound",
            preventerTitle: "Bound",
            preventerDescription: "This card cannot be played normally.",
          },
          validTargetIds: ["creature-1"],
        },
      ],
    },
  };

  const view = buildGameplayView(state);
  assert.equal(view.combat.hand[0].affliction.title, "Bound");
  assert.equal(view.combat.hand[0].unplayable.reason, "BlockedByHook");
  assert.equal(view.combat.hand[0].unplayable.preventerTitle, "Bound");
});
