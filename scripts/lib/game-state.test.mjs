import test from "node:test";
import assert from "node:assert/strict";

import { chooseNewestAck, chooseNewestState } from "./game-state.mjs";

test("chooseNewestState prefers the fresher file-backed state over stale monitor state", () => {
  const liveState = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T02:48:00.278Z",
    combat: {
      hand: [{ id: "card-a" }, { id: "card-b" }, { id: "card-c" }],
    },
  };
  const fileState = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T02:48:36.094Z",
    combat: {
      hand: [{ id: "card-a" }, { id: "card-b" }, { id: "card-c" }, { id: "card-d" }, { id: "card-e" }],
    },
  };

  const selected = chooseNewestState(liveState, fileState);
  assert.equal(selected, fileState);
  assert.equal(selected.combat.hand.length, 5);
});

test("chooseNewestAck prefers the fresher handled acknowledgement", () => {
  const liveAck = {
    id: "cmd-old",
    handledAtUtc: "2026-03-17T02:48:00.000Z",
  };
  const fileAck = {
    id: "cmd-new",
    handledAtUtc: "2026-03-17T02:48:01.000Z",
  };

  assert.equal(chooseNewestAck(liveAck, fileAck), fileAck);
});
