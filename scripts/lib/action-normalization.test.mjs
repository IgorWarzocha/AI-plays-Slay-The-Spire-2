import test from "node:test";
import assert from "node:assert/strict";

import { normalizeActionForCurrentState } from "./action-normalization.mjs";

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

test("combat potion actions re-resolve when earlier potion use shifts potion ids", () => {
  const state = {
    screenType: "combat_room",
    actions: [
      "combat.use_potion:potion-01:potion-shaped-rock@creature-1",
      "combat.discard_potion:potion-01:potion-shaped-rock",
    ],
  };

  assert.equal(
    normalizeActionForCurrentState("combat.use_potion:potion-02:potion-shaped-rock@creature-1", state),
    "combat.use_potion:potion-01:potion-shaped-rock@creature-1",
  );
  assert.equal(
    normalizeActionForCurrentState("combat.discard_potion:potion-02:potion-shaped-rock", state),
    "combat.discard_potion:potion-01:potion-shaped-rock",
  );
});

test("non-combat potion actions re-resolve when slot ids shift", () => {
  const state = {
    screenType: "rewards_screen",
    actions: [
      "potions.use:potion-01:blood-potion",
      "potions.discard:potion-01:blood-potion",
    ],
  };

  assert.equal(
    normalizeActionForCurrentState("potions.use:potion-03:blood-potion", state),
    "potions.use:potion-01:blood-potion",
  );
  assert.equal(
    normalizeActionForCurrentState("potions.discard:potion-03:blood-potion", state),
    "potions.discard:potion-01:blood-potion",
  );
});
