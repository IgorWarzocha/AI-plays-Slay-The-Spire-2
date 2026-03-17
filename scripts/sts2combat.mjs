#!/usr/bin/env node

import {
  parseArgs,
  readDisplayState,
  runActions,
  waitForScreen,
} from "./lib/sts2-runtime.mjs";
import { assertCombatActions } from "./lib/action-scopes.mjs";
import { buildCombatCommandView, buildCombatView } from "./lib/sts2-game-view.mjs";

function usage() {
  console.log(`Usage:
  sts2combat.mjs status [--relics] [--notes] [--raw]
  sts2combat.mjs command <action> [action...] [--strict false] [--settle-timeout-ms <ms>] [--relics] [--notes] [--raw]
  sts2combat.mjs wait-screen <screenType> [--relics] [--notes] [--raw]
`);
}

function printState(state, options) {
  console.log(JSON.stringify(buildCombatView(state, options), null, 2));
}

function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  switch (command) {
    case "status":
      printState(readDisplayState(), options);
      return;
    case "command": {
      const actions = positional.slice(1);
      if (actions.length === 0) {
        throw new Error("command requires at least one action.");
      }

      assertCombatActions(actions);
      console.log(JSON.stringify(buildCombatCommandView(runActions(actions, options), options), null, 2));
      return;
    }
    case "wait-screen": {
      const screenType = positional[1];
      if (!screenType) {
        throw new Error("wait-screen requires a screen type.");
      }

      printState(waitForScreen(screenType), options);
      return;
    }
    default:
      usage();
      if (command) {
        process.exitCode = 1;
      }
  }
}

main();
