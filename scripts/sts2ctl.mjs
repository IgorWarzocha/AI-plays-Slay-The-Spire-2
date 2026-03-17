#!/usr/bin/env node

import {
  parseArgs,
  readState,
  runActions,
  startStandardRun,
  waitForScreen,
} from "./lib/sts2-runtime.mjs";
import { buildCommandView, buildGameplayView } from "./lib/sts2-game-view.mjs";

function usage() {
  console.log(`Usage:
  sts2ctl.mjs status [--relics] [--notes] [--menu] [--raw]
  sts2ctl.mjs command <action> [action...] [--character <id>] [--seed <seed>] [--act1 <act>] [--strict false] [--settle-timeout-ms <ms>] [--relics] [--notes] [--menu] [--raw]
  sts2ctl.mjs wait-screen <screenType> [--relics] [--notes] [--menu] [--raw]
  sts2ctl.mjs start-standard [--character <id>] [--seed <seed>] [--act1 <act>] [--relics] [--notes] [--menu] [--raw]
`);
}

function printGameplayState(state, options) {
  console.log(JSON.stringify(buildGameplayView(state, options), null, 2));
}

function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  switch (command) {
    case "status":
      printGameplayState(readState(), options);
      return;
    case "command": {
      const actions = positional.slice(1);
      if (actions.length === 0) {
        throw new Error("command requires at least one action.");
      }

      console.log(JSON.stringify(buildCommandView(runActions(actions, options), options), null, 2));
      return;
    }
    case "wait-screen": {
      const screenType = positional[1];
      if (!screenType) {
        throw new Error("wait-screen requires a screen type.");
      }

      printGameplayState(waitForScreen(screenType), options);
      return;
    }
    case "start-standard":
      console.log(JSON.stringify(buildGameplayView(startStandardRun(options)?.state ?? readState(), options), null, 2));
      return;
    default:
      usage();
      if (command) {
        process.exitCode = 1;
      }
  }
}

main();
