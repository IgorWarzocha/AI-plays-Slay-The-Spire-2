import test from "node:test";
import assert from "node:assert/strict";

import { normalizeActionForCurrentState } from "../lib/action-normalization.ts";

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
  assert.equal(
    normalizeActionForCurrentState("merchant.buy:card-tremble", state),
    "merchant.buy:card-02-tremble",
  );
  assert.equal(
    normalizeActionForCurrentState("merchant.buy:remove-a-card", state),
    "merchant.buy:remove-11-remove-a-card",
  );
});

test("merchant aliases fail clearly for disabled inventory entries", () => {
  const state = {
    screenType: "merchant_inventory",
    actions: [
      "merchant.buy:card-00-pommel-strike",
      "merchant.close",
    ],
    menuItems: [
      { id: "card-00-pommel-strike", label: "Pommel Strike", enabled: true },
      { id: "relic-01-cloak-clasp", label: "Cloak Clasp", enabled: false },
    ],
  };

  assert.throws(
    () => normalizeActionForCurrentState("merchant.buy:relic-cloak-clasp", state),
    /currently unavailable/,
  );
});

test("merchant aliases fail clearly when ambiguous", () => {
  const state = {
    screenType: "merchant_inventory",
    actions: [
      "merchant.buy:card-00-shrug-it-off",
      "merchant.buy:card-01-shrug-it-off",
    ],
    menuItems: [
      { id: "card-00-shrug-it-off", label: "Shrug It Off", enabled: true },
      { id: "card-01-shrug-it-off", label: "Shrug It Off", enabled: true },
    ],
  };

  assert.throws(
    () => normalizeActionForCurrentState("merchant.buy:card-shrug-it-off", state),
    /ambiguous/,
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

test("generic proceed resolves to the current surface proceed action", () => {
  const eventState = {
    screenType: "event",
    actions: ["event.choose:textkey:proceed", "top_bar.deck"],
    menuItems: [
      { id: "textkey:proceed", label: "Proceed", enabled: true, selected: false },
    ],
  };
  const rewardState = {
    screenType: "rewards_screen",
    actions: ["rewards.proceed"],
  };

  assert.equal(normalizeActionForCurrentState("proceed", eventState), "event.choose:textkey:proceed");
  assert.equal(normalizeActionForCurrentState("proceed", rewardState), "rewards.proceed");
});

test("reward aliases resolve against dynamic reward action ids", () => {
  const state = {
    screenType: "rewards_screen",
    actions: [
      "rewards.claim:reward-Gold-1-2a11",
      "rewards.claim:reward-Potion-2-41fdba",
      "rewards.claim:reward-Relic-3-bowl",
      "rewards.claim:reward-Card-4-cc99",
      "rewards.proceed",
    ],
    menuItems: [
      { id: "reward-Gold-1-2a11", label: "17 Gold", description: "17 Gold" },
      { id: "reward-Potion-2-41fdba", label: "Speed Potion", description: "Gain Dexterity." },
      { id: "reward-Relic-3-bowl", label: "Strawberry", description: "Relic reward." },
      { id: "reward-Card-4-cc99", label: "Add a card to your deck.", description: "Add a card to your deck." },
    ],
  };

  assert.equal(normalizeActionForCurrentState("rewards.claim:gold", state), "rewards.claim:reward-Gold-1-2a11");
  assert.equal(normalizeActionForCurrentState("rewards.claim:potion", state), "rewards.claim:reward-Potion-2-41fdba");
  assert.equal(normalizeActionForCurrentState("rewards.claim:relic", state), "rewards.claim:reward-Relic-3-bowl");
  assert.equal(normalizeActionForCurrentState("rewards.claim:card", state), "rewards.claim:reward-Card-4-cc99");
});

test("raw reward ids re-resolve when only a dynamic suffix changed", () => {
  const state = {
    screenType: "rewards_screen",
    actions: [
      "rewards.claim:reward-Gold-1-2a11",
      "rewards.claim:reward-Potion-2-41fdba",
    ],
  };

  assert.equal(
    normalizeActionForCurrentState("rewards.claim:reward-Gold-1", state),
    "rewards.claim:reward-Gold-1-2a11",
  );
  assert.equal(
    normalizeActionForCurrentState("rewards.claim:reward-Potion-2", state),
    "rewards.claim:reward-Potion-2-41fdba",
  );
});
