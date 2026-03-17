import test from "node:test";
import assert from "node:assert/strict";

import {
  isCombatCardSelectSelectionFollowThroughState,
  isDeckCardSelectFollowThroughState,
  isInteractiveFollowUpTransition,
  isMapTravelFollowThroughState,
  isMerchantActionFollowThroughState,
  isMerchantInventoryConsistent,
  isPotionUseFollowThroughState,
  isRewardClaimFollowThroughState,
  isRewardPotionClaimFollowThroughState,
} from "../lib/follow-through-state.ts";

test("interactive follow-up transitions settle even while ack stays pending", () => {
  const beforeState = {
    screenType: "merchant_inventory",
    updatedAtUtc: "2026-03-17T09:25:00.000Z",
    actions: ["merchant.buy:remove-13-remove-a-card"],
  };
  const afterState = {
    screenType: "deck_card_select",
    updatedAtUtc: "2026-03-17T09:25:00.800Z",
    actions: ["deck_card_select.select:strike-01"],
  };
  const ack = { id: "cmd-1", status: "pending" };

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
    updatedAtUtc: "2026-03-17T09:34:00.000Z",
    topBar: { hp: "42/80" },
    potions: [
      { id: "potion-02:blood-potion", title: "Blood Potion" },
      { id: "potion-03:fire-potion", title: "Fire Potion" },
    ],
  };
  const staleState = {
    ...referenceState,
    updatedAtUtc: "2026-03-17T09:34:00.100Z",
  };
  const healedState = {
    screenType: "rewards_screen",
    updatedAtUtc: "2026-03-17T09:34:01.000Z",
    topBar: { hp: "58/80" },
    potions: [{ id: "potion-03:fire-potion", title: "Fire Potion" }],
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

test("reward potion claims wait for the potion inventory or reward list to change", () => {
  const beforeState = {
    screenType: "rewards_screen",
    updatedAtUtc: "2026-03-17T09:40:00.000Z",
    potions: [{ id: "potion-01:blood-potion", title: "Blood Potion" }],
    menuItems: [
      { id: "reward-Potion-2-41fdba", label: "Potion" },
      { id: "reward-Gold-1-2a11", label: "100 Gold" },
    ],
  };
  const staleState = {
    ...beforeState,
    updatedAtUtc: "2026-03-17T09:40:00.200Z",
  };
  const updatedState = {
    screenType: "rewards_screen",
    updatedAtUtc: "2026-03-17T09:40:01.000Z",
    potions: [
      { id: "potion-01:blood-potion", title: "Blood Potion" },
      { id: "potion-02:strength-potion", title: "Strength Potion" },
    ],
    menuItems: [{ id: "reward-Gold-1-2a11", label: "100 Gold" }],
  };

  assert.equal(
    isRewardPotionClaimFollowThroughState("rewards.claim:reward-Potion-2-41fdba", beforeState, staleState),
    false,
  );
  assert.equal(
    isRewardPotionClaimFollowThroughState("rewards.claim:reward-Potion-2-41fdba", beforeState, updatedState),
    true,
  );
});

test("generic reward claims treat top-bar and reward-list changes as post-claim state", () => {
  const beforeState = {
    screenType: "rewards_screen",
    updatedAtUtc: "2026-03-17T09:40:00.000Z",
    topBar: { gold: 40 },
    potions: [{ id: "potion-01:blood-potion", title: "Blood Potion" }],
    menuItems: [
      { id: "reward-Gold-1", label: "17 Gold" },
      { id: "reward-Card-1", label: "Card" },
    ],
    actions: ["rewards.claim:reward-Gold-1", "rewards.claim:reward-Card-1"],
    notes: ["Rewards visible: 2."],
  };
  const staleState = {
    ...beforeState,
    updatedAtUtc: "2026-03-17T09:40:00.100Z",
  };
  const updatedState = {
    screenType: "rewards_screen",
    updatedAtUtc: "2026-03-17T09:40:01.000Z",
    topBar: { gold: 57 },
    potions: [{ id: "potion-01:blood-potion", title: "Blood Potion" }],
    menuItems: [{ id: "reward-Card-1", label: "Card" }],
    actions: ["rewards.claim:reward-Card-1", "rewards.proceed"],
    notes: ["Rewards visible: 1."],
  };

  assert.equal(
    isRewardClaimFollowThroughState("rewards.claim:reward-Gold-1", beforeState, staleState),
    false,
  );
  assert.equal(
    isRewardClaimFollowThroughState("rewards.claim:reward-Gold-1", beforeState, updatedState),
    true,
  );
});

test("merchant inventory consistency rejects affordable items marked as not enough gold", () => {
  const inconsistentState = {
    screenType: "merchant_inventory",
    topBar: { gold: 193 },
    menuItems: [
      { id: "card-01", description: "Cost: 71 gold\nNot enough gold." },
      { id: "close", description: "Leave" },
    ],
  };
  const consistentState = {
    screenType: "merchant_inventory",
    topBar: { gold: 55 },
    menuItems: [
      { id: "card-01", description: "Cost: 71 gold\nNot enough gold." },
      { id: "close", description: "Leave" },
    ],
  };

  assert.equal(isMerchantInventoryConsistent(inconsistentState), false);
  assert.equal(isMerchantInventoryConsistent(consistentState), true);
});

test("deck card select follow-through waits past inconsistent merchant frames", () => {
  const beforeState = {
    screenType: "deck_card_select",
    updatedAtUtc: "2026-03-17T09:58:00.000Z",
  };
  const inconsistentMerchant = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date(Date.now()).toISOString(),
    topBar: { gold: 193 },
    menuItems: [{ id: "card-01", description: "Cost: 71 gold\nNot enough gold." }],
  };
  const settledMerchant = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date(Date.now() - 1000).toISOString(),
    topBar: { gold: 122 },
    menuItems: [{ id: "card-01", description: "Cost: 71 gold" }],
  };

  assert.equal(
    isDeckCardSelectFollowThroughState("deck_card_select.select:strike-01", beforeState, inconsistentMerchant),
    false,
  );
  assert.equal(
    isDeckCardSelectFollowThroughState("deck_card_select.select:strike-01", beforeState, settledMerchant),
    true,
  );
});

test("combat card select follow-through accepts a progressed same-screen selection state", () => {
  const beforeState = {
    screenType: "combat_card_select",
    updatedAtUtc: "2026-03-17T23:04:34.000Z",
    actions: [
      "combat_card_select.select:card-a",
      "combat_card_select.select:card-b",
    ],
    notes: ["Selection progress: 0/1 selected (min 1)."],
    menuItems: [
      { id: "card-a", label: "A", selected: false },
      { id: "card-b", label: "B", selected: false },
    ],
    combat: {
      hand: [{ id: "card-a", title: "A" }, { id: "card-b", title: "B" }],
    },
  };

  const afterState = {
    screenType: "combat_card_select",
    updatedAtUtc: "2026-03-17T23:04:35.000Z",
    actions: [
      "combat_card_select.select:card-b",
      "combat_card_select.confirm",
    ],
    notes: ["Selection progress: 1/1 selected (min 1)."],
    menuItems: [
      { id: "card-b", label: "B", selected: false },
    ],
    combat: {
      hand: [{ id: "card-b", title: "B" }],
    },
  };

  assert.equal(
    isCombatCardSelectSelectionFollowThroughState("combat_card_select.select:card-a", beforeState, afterState),
    true,
  );
});

test("deck card select follow-through accepts a live consistent merchant inventory frame", () => {
  const beforeState = {
    screenType: "deck_card_select",
    updatedAtUtc: "2026-03-17T09:59:00.000Z",
  };
  const liveMerchant = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date().toISOString(),
    topBar: { gold: 135 },
    menuItems: [{ id: "card-01", description: "Cost: 49 gold." }],
  };

  assert.equal(
    isDeckCardSelectFollowThroughState("deck_card_select.select:strike-01", beforeState, liveMerchant),
    true,
  );
});

test("deck card select follow-through accepts a settled combat return frame", () => {
  const beforeState = {
    screenType: "deck_card_select",
    updatedAtUtc: "2026-03-17T10:05:00.000Z",
  };
  const settledCombat = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T10:05:01.000Z",
    combat: {
      handIsSettled: true,
      hand: [{ id: "shrug-it-off-plus-01" }],
    },
  };

  assert.equal(
    isDeckCardSelectFollowThroughState("deck_card_select.select:shrug-it-off-plus-01", beforeState, settledCombat),
    true,
  );
});

test("deck card select follow-through accepts a non-merchant room return frame", () => {
  const beforeState = {
    screenType: "deck_card_select",
    updatedAtUtc: "2026-03-17T10:11:00.000Z",
  };
  const restSite = {
    screenType: "rest_site",
    updatedAtUtc: "2026-03-17T10:11:01.000Z",
  };

  assert.equal(
    isDeckCardSelectFollowThroughState("deck_card_select.select:demon-form-01", beforeState, restSite),
    true,
  );
});

test("merchant buy follow-through waits for a quiet consistent inventory frame", () => {
  const beforeState = {
    screenType: "merchant_inventory",
    updatedAtUtc: "2026-03-17T10:22:00.000Z",
  };
  const inconsistentMerchant = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date(Date.now()).toISOString(),
    topBar: { gold: 193 },
    menuItems: [{ id: "card-01", description: "Cost: 71 gold\nNot enough gold." }],
  };
  const settledMerchant = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date(Date.now() - 1000).toISOString(),
    topBar: { gold: 122 },
    menuItems: [{ id: "card-01", description: "Cost: 71 gold" }],
  };

  assert.equal(
    isMerchantActionFollowThroughState("merchant.buy:card-02-shrug-it-off", beforeState, inconsistentMerchant),
    false,
  );
  assert.equal(
    isMerchantActionFollowThroughState("merchant.buy:card-02-shrug-it-off", beforeState, settledMerchant),
    true,
  );
});

test("merchant remove buy follow-through accepts the live deck-card select overlay", () => {
  const beforeState = {
    screenType: "merchant_inventory",
    updatedAtUtc: "2026-03-17T10:23:00.000Z",
  };
  const deckCardSelect = {
    screenType: "deck_card_select",
    updatedAtUtc: new Date().toISOString(),
    notes: [
      "Programmatic deck-card selection is active for this overlay screen (deck).",
      "Prompt: Choose a card to [gold]Remove[/gold].",
    ],
    menuItems: [
      { id: "strike-01", label: "Strike", description: "Deal 6 damage." },
    ],
  };

  assert.equal(
    isMerchantActionFollowThroughState("merchant.buy:remove-13-remove-a-card", beforeState, deckCardSelect),
    true,
  );
});

test("merchant open follow-through waits for the quiet consistent inventory frame", () => {
  const beforeState = {
    screenType: "merchant_room",
    updatedAtUtc: "2026-03-17T10:24:00.000Z",
  };
  const inconsistentMerchant = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date(Date.now()).toISOString(),
    topBar: { gold: 210 },
    menuItems: [{ id: "card-01", description: "Cost: 71 gold\nNot enough gold." }],
  };
  const settledMerchant = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date(Date.now() - 1000).toISOString(),
    topBar: { gold: 210 },
    menuItems: [{ id: "card-01", description: "Cost: 71 gold." }],
  };

  assert.equal(
    isMerchantActionFollowThroughState("merchant.open", beforeState, inconsistentMerchant),
    false,
  );
  assert.equal(
    isMerchantActionFollowThroughState("merchant.open", beforeState, settledMerchant),
    true,
  );
});

test("merchant open follow-through accepts a live consistent inventory frame", () => {
  const beforeState = {
    screenType: "merchant_room",
    updatedAtUtc: "2026-03-17T10:24:30.000Z",
  };
  const liveMerchant = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date().toISOString(),
    topBar: { gold: 210 },
    menuItems: [{ id: "card-01", description: "Cost: 71 gold." }],
  };

  assert.equal(
    isMerchantActionFollowThroughState("merchant.open", beforeState, liveMerchant),
    true,
  );
});

test("merchant leave follow-through requires the quiet map frame", () => {
  const beforeState = {
    screenType: "merchant_inventory",
    updatedAtUtc: "2026-03-17T10:26:00.000Z",
  };
  const mapState = {
    screenType: "map_screen",
    updatedAtUtc: new Date(Date.now() - 1000).toISOString(),
  };

  assert.equal(isMerchantActionFollowThroughState("merchant.leave", beforeState, mapState), true);
});

test("map travel waits past transient room shells and returns the destination surface", () => {
  const beforeState = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T10:36:00.000Z",
  };
  const transientCombatShell = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T10:36:00.500Z",
    combat: null,
  };
  const destinationState = {
    screenType: "rest_site",
    updatedAtUtc: "2026-03-17T10:36:01.000Z",
  };

  assert.equal(isMapTravelFollowThroughState(beforeState, transientCombatShell), false);
  assert.equal(isMapTravelFollowThroughState(beforeState, destinationState), true);
});

test("map travel accepts a settled combat destination", () => {
  const beforeState = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T10:42:00.000Z",
  };
  const combatDestination = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T10:42:01.000Z",
    lastHandledCommandId: "cmd-expected",
    combat: {
      handIsSettled: true,
      hand: [{ id: "strike-01" }],
    },
  };

  assert.equal(isMapTravelFollowThroughState(beforeState, combatDestination), true);
});

test("map travel accepts a newer non-combat destination frame", () => {
  const beforeState = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T10:43:00.000Z",
  };
  const freshTreasure = {
    screenType: "treasure_room",
    updatedAtUtc: new Date().toISOString(),
  };

  assert.equal(isMapTravelFollowThroughState(beforeState, freshTreasure), true);
});

test("map travel ignores a stale mutated map frame before the command is actually handled", () => {
  const beforeState = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T10:47:00.000Z",
    map: {
      points: [{ id: "map-1", col: 0, row: 0, state: "current" }],
    },
  };
  const staleAfterState = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T10:47:00.500Z",
    lastHandledCommandId: "cmd-other",
    map: {
      points: [{ id: "map-1", col: 0, row: 0, state: "visited" }],
    },
  };
  const combatDestination = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T10:47:01.000Z",
    lastHandledCommandId: "cmd-expected",
    combat: {
      handIsSettled: true,
      hand: [{ id: "strike-01" }],
    },
  };

  assert.equal(
    isMapTravelFollowThroughState(beforeState, staleAfterState, "cmd-expected"),
    false,
  );
  assert.equal(
    isMapTravelFollowThroughState(beforeState, combatDestination, "cmd-expected"),
    true,
  );
});

test("map travel ignores in-flight traveling map frames", () => {
  const beforeState = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T10:52:00.000Z",
    map: {
      traveling: false,
      travelEnabled: true,
      points: [{ id: "3,0", col: 3, row: 0, state: "Traveled" }],
    },
  };
  const travelingMap = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T10:52:00.500Z",
    lastHandledCommandId: "cmd-expected",
    map: {
      traveling: true,
      travelEnabled: false,
      points: [{ id: "4,1", col: 4, row: 1, state: "Traveled" }],
    },
  };
  const settledCombat = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T10:52:01.000Z",
    lastHandledCommandId: "cmd-expected",
    combat: {
      handIsSettled: true,
      hand: [{ id: "strike-01" }],
    },
  };

  assert.equal(isMapTravelFollowThroughState(beforeState, travelingMap, "cmd-expected"), false);
  assert.equal(isMapTravelFollowThroughState(beforeState, settledCombat, "cmd-expected"), true);
});
