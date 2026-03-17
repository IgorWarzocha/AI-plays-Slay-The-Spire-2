import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCombatStabilityKey,
  isCombatDisplayStable,
  isInteractiveFollowUpTransition,
  isPotionUseFollowThroughState,
  normalizeActionForCurrentState,
} from "./command-client.mjs";

test("combat stability key changes when hand membership changes", () => {
  const partial = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T02:54:12.117Z",
    combat: {
      roundNumber: 2,
      currentSide: "Player",
      energy: 3,
      hand: [{ id: "beckon", isPlayable: true }],
      creatures: [],
      handIsSettled: true,
    },
  };
  const full = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T02:56:06.248Z",
    combat: {
      roundNumber: 2,
      currentSide: "Player",
      energy: 3,
      hand: [
        { id: "beckon", isPlayable: true },
        { id: "feed", isPlayable: true },
        { id: "setup-strike", isPlayable: true },
      ],
      creatures: [],
      handIsSettled: true,
    },
  };

  assert.notEqual(buildCombatStabilityKey(partial), buildCombatStabilityKey(full));
});

test("combat display stability requires a quiet period after the last update", () => {
  const now = Date.now();
  const fresh = {
    screenType: "combat_room",
    updatedAtUtc: new Date(now).toISOString(),
    combat: {
      handIsSettled: true,
      hand: [],
    },
  };
  const quiet = {
    screenType: "combat_room",
    updatedAtUtc: new Date(now - 1000).toISOString(),
    combat: {
      handIsSettled: true,
      hand: [],
    },
  };

  assert.equal(isCombatDisplayStable(fresh, { quietPeriodMs: 500 }), false);
  assert.equal(isCombatDisplayStable(quiet, { quietPeriodMs: 500 }), true);
});

test("merchant actions re-resolve when slot indices shift after a purchase", () => {
  const state = {
    screenType: "merchant_inventory",
    actions: [
      "merchant.buy:card-00-pommel-strike",
      "merchant.buy:card-01-pillage",
      "merchant.buy:card-02-tremble",
      "merchant.buy:remove-11-remove-a-card",
    ],
  };

  assert.equal(
    normalizeActionForCurrentState("merchant.buy:card-03-tremble", state),
    "merchant.buy:card-02-tremble",
  );
  assert.equal(
    normalizeActionForCurrentState("merchant.buy:remove-13-remove-a-card", state),
    "merchant.buy:remove-11-remove-a-card",
  );
});

test("interactive follow-up transitions settle even while ack stays pending", () => {
  const beforeState = {
    screenType: "merchant_inventory",
    updatedAtUtc: "2026-03-17T09:25:00.000Z",
    actions: ["merchant.buy:remove-13-remove-a-card"],
  };
  const afterState = {
    screenType: "deck_card_select",
    updatedAtUtc: "2026-03-17T09:25:01.000Z",
    actions: ["deck_card_select.select:strike-01"],
  };
  const ack = {
    id: "cmd-1",
    status: "pending",
  };

  assert.equal(isInteractiveFollowUpTransition(beforeState, afterState, ack), true);
  assert.equal(isInteractiveFollowUpTransition(beforeState, beforeState, ack), false);
  assert.equal(
    isInteractiveFollowUpTransition(beforeState, afterState, { ...ack, status: "completed" }),
    false,
  );
});

test("potion use follow-through waits for the post-effect non-combat frame", () => {
  const referenceState = {
    screenType: "rewards_screen",
    updatedAtUtc: "2026-03-17T10:09:22.483Z",
    topBar: { hp: "74/89" },
    potions: [
      { id: "potion-01:swift-potion", title: "Swift Potion" },
      { id: "potion-02:regen-potion", title: "Regen Potion" },
    ],
  };
  const staleState = {
    screenType: "rewards_screen",
    updatedAtUtc: "2026-03-17T10:09:22.483Z",
    topBar: { hp: "74/89" },
    potions: [
      { id: "potion-01:swift-potion", title: "Swift Potion" },
      { id: "potion-02:regen-potion", title: "Regen Potion" },
    ],
  };
  const healedState = {
    screenType: "rewards_screen",
    updatedAtUtc: "2026-03-17T10:09:37.635Z",
    topBar: { hp: "89/89" },
    potions: [
      { id: "potion-01:swift-potion", title: "Swift Potion" },
      { id: "potion-02:regen-potion", title: "Regen Potion" },
    ],
  };

  assert.equal(
    isPotionUseFollowThroughState("potions.use:potion-02:blood-potion", referenceState, staleState),
    false,
  );
  assert.equal(
    isPotionUseFollowThroughState("potions.use:potion-02:blood-potion", referenceState, healedState),
    true,
  );
});
