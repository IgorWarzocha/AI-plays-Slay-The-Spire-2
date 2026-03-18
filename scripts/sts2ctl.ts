#!/usr/bin/env node

import {
  parseArgs,
  readDisplayState,
  runActions,
  waitForScreen,
} from "./lib/sts2-runtime.ts";
import { assertGameplayActions } from "./lib/action-scopes.ts";
import { buildStatusCacheKey, printCliOutput } from "./lib/cli-output.ts";
import { buildCommandView, buildGameplayView } from "./lib/sts2-game-view.ts";
import type { DisplayState, RuntimeCommandOptions } from "./lib/types.ts";

function usage(): void {
  console.log(`Usage:
  sts2ctl.ts status [--easy | --hard | --full]
  sts2ctl.ts command <action> [action...] [--character <id>] [--seed <seed>] [--act1 <act>] [--strict false] [--settle-timeout-ms <ms>] [--easy | --hard | --full]
  sts2ctl.ts wait-screen <screenType> [--easy | --hard | --full]
`);
}

function printGameplayState(
  state: DisplayState | null | undefined,
  options: RuntimeCommandOptions,
  { dedupe = false }: { dedupe?: boolean } = {},
): void {
  if (state?.screenType === "combat_room" || state?.screenType === "combat_card_select") {
    throw new Error("sts2ctl.ts does not render combat state. Use sts2combat.ts status instead.");
  }

  printCliOutput(buildGameplayView(state, options), {
    options,
    cacheKey: dedupe ? buildStatusCacheKey('sts2ctl:state', options) : undefined,
  });
}

async function main(): Promise<void> {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  switch (command) {
    case "status":
      printGameplayState(await readDisplayState(), options, { dedupe: true });
      return;
    case "command": {
      const actions = positional.slice(1);
      if (actions.length === 0) {
        throw new Error("command requires at least one action.");
      }

      assertGameplayActions(actions);
      printCliOutput(buildCommandView(await runActions(actions, options), options), { options });
      return;
    }
    case "wait-screen": {
      const screenType = positional[1];
      if (!screenType) {
        throw new Error("wait-screen requires a screen type.");
      }

      printGameplayState(await waitForScreen(screenType), options);
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
