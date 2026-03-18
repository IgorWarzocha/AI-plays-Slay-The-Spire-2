#!/usr/bin/env node

import {
  parseArgs,
  readDisplayState,
  runActions,
  waitForScreen,
} from "./lib/sts2-runtime.ts";
import { assertCombatActions } from "./lib/action-scopes.ts";
import { buildCombatCommandView, buildCombatView } from "./lib/sts2-game-view.ts";
import type { DisplayState, RuntimeCommandOptions } from "./lib/types.ts";

function usage(): void {
  console.log(`Usage:
  sts2combat.ts status [--easy | --hard | --full]
  sts2combat.ts command <action> [action...] [--batch] [--strict false] [--settle-timeout-ms <ms>] [--easy | --hard | --full]
  sts2combat.ts wait-screen <screenType> [--easy | --hard | --full]
`);
}

function printState(state: DisplayState | null | undefined, options: RuntimeCommandOptions): void {
  console.log(JSON.stringify(buildCombatView(state, options), null, 2));
}

async function main(): Promise<void> {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  switch (command) {
    case "status":
      printState(await readDisplayState(), options);
      return;
    case "command": {
      const actions = positional.slice(1);
      if (actions.length === 0) {
        throw new Error("command requires at least one action.");
      }

      assertCombatActions(actions, options);
      console.log(JSON.stringify(buildCombatCommandView(await runActions(actions, options), options), null, 2));
      return;
    }
    case "wait-screen": {
      const screenType = positional[1];
      if (!screenType) {
        throw new Error("wait-screen requires a screen type.");
      }

      printState(await waitForScreen(screenType), options);
      return;
    }
    default:
      usage();
      if (command) {
        process.exitCode = 1;
      }
  }
}

await main();
