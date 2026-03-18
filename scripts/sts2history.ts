#!/usr/bin/env node

import {
  isRunning,
  parseArgs,
  readDisplayState,
  runActions,
} from "./lib/sts2-runtime.ts";
import { assertHistoryActions } from "./lib/action-scopes.ts";
import { buildCommandView, buildGameplayView } from "./lib/sts2-game-view.ts";
import type { DisplayState, RuntimeCommandOptions } from "./lib/types.ts";

function usage(): void {
  console.log(`Usage:
  sts2history.ts status [--menu] [--notes] [--raw]
  sts2history.ts latest [--menu] [--notes] [--raw]
  sts2history.ts command <action> [action...] [--strict false] [--settle-timeout-ms <ms>] [--menu] [--notes] [--raw]
`);
}

function printState(state: DisplayState | null | undefined, options: RuntimeCommandOptions): void {
  console.log(JSON.stringify(buildGameplayView(state, options), null, 2));
}

async function ensureLatestRunHistory(options: RuntimeCommandOptions): Promise<DisplayState | null> {
  if (!isRunning()) {
    throw new Error("latest requires STS2 to be running. Launch the game first.");
  }

  const state = await readDisplayState();

  switch (state?.screenType) {
    case "run_history":
      return state;
    case "compendium_submenu":
      return (await runActions(["compendium.run_history"], options)).state;
    case "main_menu":
      return (await runActions(["main_menu.compendium", "compendium.run_history"], options)).state;
    default:
      throw new Error(`latest requires main_menu, compendium_submenu, or run_history. Got '${state?.screenType ?? "unknown"}'.`);
  }
}

async function main(): Promise<void> {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  switch (command) {
    case "status":
      printState(await readDisplayState(), options);
      return;
    case "latest":
      printState(await ensureLatestRunHistory(options), options);
      return;
    case "command": {
      const actions = positional.slice(1);
      if (actions.length === 0) {
        throw new Error("command requires at least one action.");
      }

      assertHistoryActions(actions);
      console.log(JSON.stringify(buildCommandView(await runActions(actions, options), options), null, 2));
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
