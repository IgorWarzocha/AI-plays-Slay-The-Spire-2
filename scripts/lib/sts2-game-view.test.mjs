import test from "node:test";
import assert from "node:assert/strict";

import { buildGameplayView } from "./sts2-game-view.mjs";
import { buildCombatCommandView } from "./sts2-game-view.mjs";

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
      buttons: [],
    },
    relics: [
      { id: "BurningBlood", label: "Burning Blood", description: "Heal 6 HP.", count: null, status: "Active" },
    ],
    potions: [
      { id: "potion-01:blood-potion", title: "Blood Potion", description: "Heal 20%.", usage: "AnyTime", isUsable: true, canDiscard: true },
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
  assert.equal(view.cardBrowse.kind, "deck_snapshot");
  assert.equal(view.cardBrowse.cardCount, 2);
  assert.equal(view.menuItems[0].label, "Lantern");
});
