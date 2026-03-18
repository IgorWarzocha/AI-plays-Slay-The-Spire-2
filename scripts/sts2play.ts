#!/usr/bin/env node

import {
  parseArgs,
  readDisplayState,
  runActions,
  startStandardRun,
  waitForScreen,
} from "./lib/sts2-runtime.ts";
import {
  assertBootstrapActions,
  assertCombatActions,
  assertGameplayActions,
  isCombatScreenType,
  resolveCommandSurface,
} from "./lib/action-scopes.ts";
import { buildCommandView, buildCombatCommandView, buildCombatView, buildGameplayView } from "./lib/sts2-game-view.ts";
import type { DisplayState, RunActionsResult, RuntimeCommandOptions } from "./lib/types.ts";

function usage(): void {
  console.log(`Usage:
  sts2play.ts status [--easy | --hard | --full]
  sts2play.ts command <action> [action...] [--batch] [--character <id>] [--seed <seed>] [--act1 <act>] [--strict false] [--settle-timeout-ms <ms>] [--easy | --hard | --full]
  sts2play.ts wait-screen <screenType> [--easy | --hard | --full]
  sts2play.ts start-standard [--character <id>] [--seed <seed>] [--act1 <act>] [--easy | --hard | --full]
`);
}

function printState(state: DisplayState | null | undefined, options: RuntimeCommandOptions): void {
  const view = isCombatScreenType(state?.screenType)
    ? buildCombatView(state, options)
    : buildGameplayView(state, options);

  console.log(JSON.stringify(view, null, 2));
}

function printCommandResult(result: RunActionsResult, options: RuntimeCommandOptions): void {
  const view = isCombatScreenType(result.state?.screenType)
    ? buildCombatCommandView(result, options)
    : buildCommandView(result, options);

  console.log(JSON.stringify(view, null, 2));
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

      const currentState = await readDisplayState();
      const surface = resolveCommandSurface(actions, currentState?.screenType);

      if (surface === "bootstrap") {
        assertBootstrapActions(actions);
      } else if (surface === "combat") {
        assertCombatActions(actions, options);
      } else {
        assertGameplayActions(actions);
      }

      printCommandResult(await runActions(actions, options), options);
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
    case "start-standard":
      printState(await startStandardRun(options), options);
      return;
    default:
      usage();
      if (command) {
        process.exitCode = 1;
      }
  }
}

await main();
