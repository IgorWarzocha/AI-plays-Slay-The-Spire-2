import test from "node:test";
import assert from "node:assert/strict";

import { buildGameplayView } from "./sts2-game-view.mjs";

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
