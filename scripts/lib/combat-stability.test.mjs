import test from "node:test";
import assert from "node:assert/strict";

import { buildCombatStabilityKey, detectCombatCostChanges, isCombatDisplayStable } from "./combat-stability.mjs";

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
