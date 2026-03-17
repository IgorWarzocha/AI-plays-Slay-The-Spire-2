#!/usr/bin/env node

import {
  parseArgs,
  readDisplayState,
  runActions,
  startStandardRun,
  waitForScreen,
} from "./lib/sts2-runtime.mjs";
import { assertBootstrapActions } from "./lib/action-scopes.mjs";
import { buildCommandView, buildGameplayView } from "./lib/sts2-game-view.mjs";

function usage() {
  console.log(`Usage:
  sts2run.mjs status [--menu] [--notes] [--raw]
  sts2run.mjs command <action> [action...] [--character <id>] [--seed <seed>] [--act1 <act>] [--strict false] [--settle-timeout-ms <ms>] [--menu] [--notes] [--raw]
  sts2run.mjs wait-screen <screenType> [--menu] [--notes] [--raw]
  sts2run.mjs start-standard [--character <id>] [--seed <seed>] [--act1 <act>] [--menu] [--notes] [--raw]
`);
}

function printState(state, options) {
  console.log(JSON.stringify(buildGameplayView(state, options), null, 2));
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

      assertBootstrapActions(actions);
      console.log(JSON.stringify(buildCommandView(runActions(actions, options), options), null, 2));
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
    case "start-standard":
      printState(startStandardRun(options), options);
      return;
    default:
      usage();
      if (command) {
        process.exitCode = 1;
      }
  }
}

main();
