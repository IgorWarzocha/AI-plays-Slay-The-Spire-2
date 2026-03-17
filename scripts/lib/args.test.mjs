import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs } from "./args.mjs";

test("parseArgs separates positional arguments from boolean and valued options", () => {
  const parsed = parseArgs([
    "command",
    "combat.end_turn",
    "--relics",
    "--seed",
    "ABC123",
    "--strict",
    "false",
  ]);

  assert.deepEqual(parsed.positional, ["command", "combat.end_turn"]);
  assert.deepEqual(parsed.options, {
    relics: true,
    seed: "ABC123",
    strict: "false",
  });
});
