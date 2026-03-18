#!/usr/bin/env node

import {
  parseArgs,
  readDisplayState,
  runActions,
  waitForScreen,
} from "./lib/sts2-runtime.ts";
import { assertCombatActions } from "./lib/action-scopes.ts";
import { buildStatusCacheKey, printCliOutput } from "./lib/cli-output.ts";
import { assertPileInspectOptions } from "./lib/inspect-options.ts";
import { buildCombatCommandView, buildCombatView, buildDeckInspectView, buildPileInspectView } from "./lib/sts2-game-view.ts";
import { inspectDeck, inspectPile } from "./lib/deck-inspection.ts";
import type { DisplayState, RuntimeCommandOptions } from "./lib/types.ts";

function usage(): void {
  console.log(`Usage:
  sts2combat.ts status [--easy | --hard | --full]
  sts2combat.ts command <action> [action...] [--batch] [--strict false] [--settle-timeout-ms <ms>] [--easy | --hard | --full]
  sts2combat.ts inspect-deck [--easy | --hard | --full]
  sts2combat.ts inspect-draw [--easy]
  sts2combat.ts inspect-discard [--easy]
  sts2combat.ts inspect-exhaust [--easy]
  sts2combat.ts wait-screen <screenType> [--easy | --hard | --full]
`);
}

function printState(
  state: DisplayState | null | undefined,
  options: RuntimeCommandOptions,
  { dedupe = false }: { dedupe?: boolean } = {},
): void {
  printCliOutput(buildCombatView(state, options), {
    options,
    cacheKey: dedupe ? buildStatusCacheKey('sts2combat:state', options) : undefined,
  });
}

async function main(): Promise<void> {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  switch (command) {
    case "status":
      printState(await readDisplayState(), options, { dedupe: true });
      return;
    case "inspect-deck":
      printCliOutput(buildDeckInspectView(await inspectDeck(options), options), {
        options,
        cacheKey: buildStatusCacheKey('sts2combat:inspect-deck', options),
      });
      return;
    case "inspect-draw":
      assertPileInspectOptions(options);
      printCliOutput(buildPileInspectView(await inspectPile("draw", options), options), {
        options,
        cacheKey: buildStatusCacheKey('sts2combat:inspect-draw', options),
      });
      return;
    case "inspect-discard":
      assertPileInspectOptions(options);
      printCliOutput(buildPileInspectView(await inspectPile("discard", options), options), {
        options,
        cacheKey: buildStatusCacheKey('sts2combat:inspect-discard', options),
      });
      return;
    case "inspect-exhaust":
      assertPileInspectOptions(options);
      printCliOutput(buildPileInspectView(await inspectPile("exhaust", options), options), {
        options,
        cacheKey: buildStatusCacheKey('sts2combat:inspect-exhaust', options),
      });
      return;
    case "command": {
      const actions = positional.slice(1);
      if (actions.length === 0) {
        throw new Error("command requires at least one action.");
      }

      assertCombatActions(actions, options);
      printCliOutput(buildCombatCommandView(await runActions(actions, options), options), {
        options,
        cacheKey: buildStatusCacheKey('sts2combat:command', options),
      });
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
