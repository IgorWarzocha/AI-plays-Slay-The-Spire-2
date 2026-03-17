import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCombatStabilityKey,
  detectCombatCostChanges,
  isCombatDisplayStable,
  isDeckCardSelectFollowThroughState,
  isInteractiveFollowUpTransition,
  isMerchantActionFollowThroughState,
  isMerchantInventoryConsistent,
  isMapTravelFollowThroughState,
  isPotionUseFollowThroughState,
  isRewardPotionClaimFollowThroughState,
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

test("reward potion claims wait for the potion inventory or reward list to change", () => {
  const beforeState = {
    screenType: "rewards_screen",
    updatedAtUtc: "2026-03-17T10:30:01.000Z",
    potions: [
      { id: "potion-01:swift-potion", title: "Swift Potion" },
      { id: "potion-02:power-potion", title: "Power Potion" },
      { id: "potion-03:regen-potion", title: "Regen Potion" },
    ],
    menuItems: [
      { id: "reward-Potion-2-41fdba", label: "Soldier's Stew" },
      { id: "reward-Card-5-251eb91", label: "Add a card to your deck." },
    ],
  };
  const staleState = {
    screenType: "rewards_screen",
    updatedAtUtc: "2026-03-17T10:30:01.000Z",
    potions: beforeState.potions,
    menuItems: beforeState.menuItems,
  };
  const updatedState = {
    screenType: "rewards_screen",
    updatedAtUtc: "2026-03-17T10:30:02.000Z",
    potions: [
      { id: "potion-01:soldiers-stew", title: "Soldier's Stew" },
      { id: "potion-02:power-potion", title: "Power Potion" },
      { id: "potion-03:regen-potion", title: "Regen Potion" },
    ],
    menuItems: [
      { id: "reward-Card-5-251eb91", label: "Add a card to your deck." },
    ],
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

test("merchant inventory consistency rejects affordable items marked as not enough gold", () => {
  const inconsistentState = {
    screenType: "merchant_inventory",
    topBar: { gold: 104 },
    menuItems: [
      { id: "card-01-twin-strike", description: "Cost: 52 gold. Not enough gold.", enabled: false },
      { id: "close", description: "Close the merchant inventory.", enabled: true },
    ],
  };
  const consistentState = {
    screenType: "merchant_inventory",
    topBar: { gold: 14 },
    menuItems: [
      { id: "card-01-twin-strike", description: "Cost: 52 gold. Not enough gold.", enabled: false },
      { id: "close", description: "Close the merchant inventory.", enabled: true },
    ],
  };

  assert.equal(isMerchantInventoryConsistent(inconsistentState), false);
  assert.equal(isMerchantInventoryConsistent(consistentState), true);
});

test("deck card select follow-through waits past inconsistent merchant frames", () => {
  const now = Date.now();
  const beforeState = {
    screenType: "deck_card_select",
    updatedAtUtc: new Date(now - 4000).toISOString(),
    topBar: { gold: 114 },
  };
  const inconsistentMerchant = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date(now - 1000).toISOString(),
    topBar: { gold: 104 },
    menuItems: [
      { id: "card-01-twin-strike", description: "Cost: 52 gold. Not enough gold.", enabled: false },
      { id: "close", description: "Close the merchant inventory.", enabled: true },
    ],
  };
  const settledMerchant = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date(now - 1000).toISOString(),
    topBar: { gold: 14 },
    menuItems: [
      { id: "card-01-twin-strike", description: "Cost: 52 gold. Not enough gold.", enabled: false },
      { id: "close", description: "Close the merchant inventory.", enabled: true },
    ],
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

test("deck card select follow-through accepts a settled combat return frame", () => {
  const now = Date.now();
  const beforeState = {
    screenType: "deck_card_select",
    updatedAtUtc: new Date(now - 4000).toISOString(),
  };
  const settledCombat = {
    screenType: "combat_room",
    updatedAtUtc: new Date(now).toISOString(),
    combat: {
      handIsSettled: true,
      hand: [{ id: "card-1", isPlayable: true }],
    },
  };

  assert.equal(
    isDeckCardSelectFollowThroughState("deck_card_select.select:shrug-it-off-plus-01", beforeState, settledCombat),
    true,
  );
});

test("deck card select follow-through accepts a non-merchant room return frame", () => {
  const now = Date.now();
  const beforeState = {
    screenType: "deck_card_select",
    updatedAtUtc: new Date(now - 4000).toISOString(),
  };
  const restSite = {
    screenType: "rest_site",
    updatedAtUtc: new Date(now).toISOString(),
    actions: ["rest_site.proceed"],
  };

  assert.equal(
    isDeckCardSelectFollowThroughState("deck_card_select.select:demon-form-01", beforeState, restSite),
    true,
  );
});

test("merchant buy follow-through waits for a quiet consistent inventory frame", () => {
  const now = Date.now();
  const beforeState = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date(now - 5000).toISOString(),
    topBar: { gold: 493 },
  };
  const inconsistentMerchant = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date(now - 1000).toISOString(),
    topBar: { gold: 104 },
    menuItems: [
      { id: "card-01-twin-strike", description: "Cost: 52 gold. Not enough gold.", enabled: false },
      { id: "close", description: "Close the merchant inventory.", enabled: true },
    ],
  };
  const settledMerchant = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date(now - 1000).toISOString(),
    topBar: { gold: 161 },
    menuItems: [
      { id: "card-01-twin-strike", description: "Cost: 52 gold.", enabled: true },
      { id: "close", description: "Close the merchant inventory.", enabled: true },
    ],
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

test("merchant leave follow-through requires the quiet map frame", () => {
  const now = Date.now();
  const beforeState = {
    screenType: "merchant_inventory",
    updatedAtUtc: new Date(now - 5000).toISOString(),
  };
  const mapState = {
    screenType: "map_screen",
    updatedAtUtc: new Date(now - 1000).toISOString(),
  };

  assert.equal(isMerchantActionFollowThroughState("merchant.leave", beforeState, mapState), true);
});

test("detectCombatCostChanges reports dynamic hand cost mutations", () => {
  const beforeState = {
    screenType: "combat_room",
    combat: {
      hand: [
        { id: "pyre", title: "Pyre+", costText: "2" },
        { id: "unrelenting", title: "Unrelenting", costText: "2" },
        { id: "bash", title: "Bash+", costText: "2" },
      ],
    },
  };
  const afterPowerProc = {
    screenType: "combat_room",
    combat: {
      hand: [
        { id: "unrelenting", title: "Unrelenting", costText: "0" },
        { id: "bash", title: "Bash+", costText: "2" },
      ],
    },
  };

  assert.deepEqual(detectCombatCostChanges(beforeState, afterPowerProc), [
    {
      cardId: "unrelenting",
      title: "Unrelenting",
      beforeCost: "2",
      afterCost: "0",
    },
  ]);
});

test("map travel waits past transient room shells and returns the destination surface", () => {
  const beforeState = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T12:03:00.000Z",
    actions: ["map.travel:3,11"],
    menuItems: [{ id: "3,11", label: "RestSite (3,11)" }],
  };
  const transientCombatShell = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T12:03:01.000Z",
    actions: ["top_bar.map"],
    combat: null,
  };
  const destinationState = {
    screenType: "rest_site",
    updatedAtUtc: "2026-03-17T12:03:02.000Z",
    actions: ["rest_site.choose:HEAL", "rest_site.choose:SMITH"],
    menuItems: [{ id: "HEAL", label: "Rest" }],
    topBar: { hp: "35/92", gold: 278 },
  };

  assert.equal(isMapTravelFollowThroughState(beforeState, transientCombatShell), false);
  assert.equal(isMapTravelFollowThroughState(beforeState, destinationState), true);
});

test("map travel accepts a settled combat destination", () => {
  const beforeState = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T14:40:00.000Z",
    actions: ["map.travel:2,11"],
  };
  const combatDestination = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T14:40:05.000Z",
    combat: {
      currentSide: "Player",
      roundNumber: 1,
      handIsSettled: true,
      hand: [{ id: "strike", title: "Strike", costText: "1", isPlayable: true }],
      creatures: [],
    },
  };

  assert.equal(isMapTravelFollowThroughState(beforeState, combatDestination), true);
});

test("map travel ignores a stale mutated map frame before the command is actually handled", () => {
  const beforeState = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T14:59:18.398Z",
    actions: ["map.travel:2,12"],
    menuItems: [{ id: "2,12", label: "Elite (2,12)" }],
  };
  const staleAfterState = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T14:59:33.418Z",
    actions: [],
    menuItems: [],
    lastHandledCommandId: "cmd-other",
  };

  assert.equal(
    isMapTravelFollowThroughState(beforeState, staleAfterState, "cmd-expected"),
    false,
  );
});

test("map travel accepts a handled combat destination", () => {
  const beforeState = {
    screenType: "map_screen",
    updatedAtUtc: "2026-03-17T14:59:18.398Z",
    actions: ["map.travel:2,12"],
  };
  const combatDestination = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T14:59:50.524Z",
    lastHandledCommandId: "cmd-expected",
    combat: {
      currentSide: "Player",
      roundNumber: 1,
      handIsSettled: true,
      hand: [{ id: "strike", title: "Strike", costText: "1", isPlayable: true }],
      creatures: [],
    },
  };

  assert.equal(
    isMapTravelFollowThroughState(beforeState, combatDestination, "cmd-expected"),
    true,
  );
});
