#!/usr/bin/env node

import {
  parseArgs,
  readDisplayState,
  runActions,
  startStandardRun,
  waitForScreen,
} from "./lib/sts2-runtime.ts";
import { assertBootstrapActions } from "./lib/action-scopes.ts";
import { buildCommandView, buildGameplayView } from "./lib/sts2-game-view.ts";
import type { DisplayState, RuntimeCommandOptions } from "./lib/types.ts";

function usage(): void {
  console.log(`Usage:
  sts2run.ts status [--easy | --hard | --full]
  sts2run.ts command <action> [action...] [--character <id>] [--seed <seed>] [--act1 <act>] [--strict false] [--settle-timeout-ms <ms>] [--easy | --hard | --full]
  sts2run.ts wait-screen <screenType> [--easy | --hard | --full]
  sts2run.ts start-standard [--character <id>] [--seed <seed>] [--act1 <act>] [--easy | --hard | --full]
`);
}

function printState(state: DisplayState | null | undefined, options: RuntimeCommandOptions): void {
  console.log(JSON.stringify(buildGameplayView(state, options), null, 2));
}

function main(): void {
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
