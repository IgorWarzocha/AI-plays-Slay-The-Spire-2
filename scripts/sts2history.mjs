#!/usr/bin/env node

import {
  isRunning,
  parseArgs,
  readDisplayState,
  runActions,
} from "./lib/sts2-runtime.mjs";
import { assertHistoryActions } from "./lib/action-scopes.mjs";
import { buildCommandView, buildGameplayView } from "./lib/sts2-game-view.mjs";

function usage() {
  console.log(`Usage:
  sts2history.mjs status [--menu] [--notes] [--raw]
  sts2history.mjs latest [--menu] [--notes] [--raw]
  sts2history.mjs command <action> [action...] [--strict false] [--settle-timeout-ms <ms>] [--menu] [--notes] [--raw]
`);
}

function printState(state, options) {
  console.log(JSON.stringify(buildGameplayView(state, options), null, 2));
}

function ensureLatestRunHistory(options) {
  if (!isRunning()) {
    throw new Error("latest requires STS2 to be running. Launch the game first.");
  }

  const state = readDisplayState();

  switch (state?.screenType) {
    case "run_history":
      return state;
    case "compendium_submenu":
      return runActions(["compendium.run_history"], options).state;
    case "main_menu":
      return runActions(["main_menu.compendium", "compendium.run_history"], options).state;
    default:
      throw new Error(`latest requires main_menu, compendium_submenu, or run_history. Got '${state?.screenType ?? "unknown"}'.`);
  }
}

function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  switch (command) {
    case "status":
      printState(readDisplayState(), options);
      return;
    case "latest":
      printState(ensureLatestRunHistory(options), options);
      return;
    case "command": {
      const actions = positional.slice(1);
      if (actions.length === 0) {
        throw new Error("command requires at least one action.");
      }

      assertHistoryActions(actions);
      console.log(JSON.stringify(buildCommandView(runActions(actions, options), options), null, 2));
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
