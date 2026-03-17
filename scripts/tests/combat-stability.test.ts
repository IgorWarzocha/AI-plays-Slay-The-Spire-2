import test from "node:test";
import assert from "node:assert/strict";

import { buildCombatStabilityKey, detectCombatCostChanges, isCombatDisplayStable } from "../lib/combat-stability.ts";
import { isCombatStateSettled } from "../lib/command-state-utils.ts";

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

test("combat display stability keys off settled non-animating combat state, not timestamp churn", () => {
  const freshSettled = {
    screenType: "combat_room",
    updatedAtUtc: new Date().toISOString(),
    combat: {
      handIsSettled: true,
      handAnimationActive: false,
      cardPlayInProgress: false,
      pendingHandHolderCount: 0,
      hand: [],
    },
  };
  const animating = {
    screenType: "combat_room",
    updatedAtUtc: new Date().toISOString(),
    combat: {
      handIsSettled: true,
      handAnimationActive: true,
      cardPlayInProgress: false,
      pendingHandHolderCount: 0,
      hand: [],
    },
  };
  const unsettled = {
    screenType: "combat_room",
    updatedAtUtc: new Date().toISOString(),
    combat: {
      handIsSettled: false,
      handAnimationActive: false,
      cardPlayInProgress: false,
      pendingHandHolderCount: 0,
      hand: [],
    },
  };

  assert.equal(isCombatDisplayStable(freshSettled, { quietPeriodMs: 500 }), true);
  assert.equal(isCombatDisplayStable(animating, { quietPeriodMs: 500 }), false);
  assert.equal(isCombatDisplayStable(unsettled, { quietPeriodMs: 500 }), false);
});

test("detectCombatCostChanges reports dynamic hand cost mutations", () => {
  const beforeState = {
    screenType: "combat_room",
    combat: {
      hand: [
        { id: "bash-01", title: "Bash", costText: "2" },
        { id: "strike-01", title: "Strike", costText: "1" },
      ],
    },
  };
  const afterPowerProc = {
    screenType: "combat_room",
    combat: {
      hand: [
        { id: "bash-01", title: "Bash", costText: "1" },
        { id: "strike-01", title: "Strike", costText: "0" },
        { id: "ghost-card-01", title: "Ghost Card", costText: "0" },
      ],
    },
  };

  assert.deepEqual(detectCombatCostChanges(beforeState, afterPowerProc), [
    {
      cardId: "bash-01",
      title: "Bash",
      beforeCost: "2",
      afterCost: "1",
    },
    {
      cardId: "strike-01",
      title: "Strike",
      beforeCost: "1",
      afterCost: "0",
    },
  ]);
});

test("combat settled fallback accepts sparse player-turn snapshots with a concrete hand", () => {
  const sparseButUsable = {
    screenType: "combat_room",
    combat: {
      currentSide: "Player",
      canEndTurn: true,
      handIsSettled: null,
      pendingHandHolderCount: null,
      handAnimationActive: null,
      cardPlayInProgress: null,
      hand: [{ id: "card-a" }, { id: "card-b" }],
    },
  };

  const stillAnimating = {
    screenType: "combat_room",
    combat: {
      currentSide: "Player",
      canEndTurn: true,
      handIsSettled: null,
      pendingHandHolderCount: 1,
      handAnimationActive: true,
      cardPlayInProgress: false,
      hand: [{ id: "card-a" }],
    },
  };

  assert.equal(isCombatStateSettled(sparseButUsable), true);
  assert.equal(isCombatStateSettled(stillAnimating), false);
});

test("combat card select can be settled even while handIsSettled is false", () => {
  const actionableSelection = {
    screenType: "combat_card_select",
    actions: ["combat_card_select.select:card-b", "combat_card_select.confirm"],
    menuItems: [{ id: "card-b", label: "Strike+" }],
    combat: {
      handIsSettled: false,
      handAnimationActive: false,
      cardPlayInProgress: false,
      pendingHandHolderCount: 0,
      selectionMode: "SimpleSelect",
      selectionPrompt: "Choose a card to Exhaust.",
      currentSide: "Player",
      canEndTurn: false,
      hand: [{ id: "card-b" }],
    },
  };

  assert.equal(isCombatStateSettled(actionableSelection), true);
  assert.equal(isCombatDisplayStable(actionableSelection, { quietPeriodMs: 500 }), true);
});
