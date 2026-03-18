#!/usr/bin/env node

import {
  isRunning,
  parseArgs,
  readDisplayState,
  runActions,
} from "./lib/sts2-runtime.ts";
import { assertHistoryActions } from "./lib/action-scopes.ts";
import { buildStatusCacheKey, printCliOutput } from "./lib/cli-output.ts";
import { buildCommandView, buildGameplayView } from "./lib/sts2-game-view.ts";
import type { DisplayState, RuntimeCommandOptions } from "./lib/types.ts";

function usage(): void {
  console.log(`Usage:
  sts2history.ts status [--menu] [--notes] [--raw]
  sts2history.ts latest [--menu] [--notes] [--raw]
  sts2history.ts command <action> [action...] [--strict false] [--settle-timeout-ms <ms>] [--menu] [--notes] [--raw]
`);
}

function printState(
  state: DisplayState | null | undefined,
  options: RuntimeCommandOptions,
  { dedupe = false }: { dedupe?: boolean } = {},
): void {
  printCliOutput(buildGameplayView(state, options), {
    options,
    cacheKey: dedupe ? buildStatusCacheKey('sts2history:state', options) : undefined,
  });
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
      printState(await readDisplayState(), options, { dedupe: true });
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
      printCliOutput(buildCommandView(await runActions(actions, options), options), { options });
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
