#!/usr/bin/env node

import {
  parseArgs,
  readDisplayState,
  sendAction,
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
import { buildStatusCacheKey, printCliOutput } from "./lib/cli-output.ts";
import { buildCommandView, buildCombatCommandView, buildCombatView, buildGameplayView } from "./lib/sts2-game-view.ts";
import type { DisplayState, RunActionsResult, RuntimeCommandOptions } from "./lib/types.ts";

function usage(): void {
  console.log(`Usage:
  sts2play.ts status [--easy | --hard | --full]
  sts2play.ts command <action> [action...] [--batch] [--character <id>] [--seed <seed>] [--act1 <act>] [--strict false] [--settle-timeout-ms <ms>] [--easy | --hard | --full]
  sts2play.ts inspect-deck [--easy | --hard | --full]
  sts2play.ts wait-screen <screenType> [--easy | --hard | --full]
  sts2play.ts start-standard [--character <id>] [--seed <seed>] [--act1 <act>] [--easy | --hard | --full]
`);
}

function printState(
  state: DisplayState | null | undefined,
  options: RuntimeCommandOptions,
  { dedupe = false }: { dedupe?: boolean } = {},
): void {
  const view = isCombatScreenType(state?.screenType)
    ? buildCombatView(state, options)
    : buildGameplayView(state, options);

  printCliOutput(view, {
    options,
    cacheKey: dedupe ? buildStatusCacheKey('sts2play:state', options) : undefined,
  });
}

function printCommandResult(result: RunActionsResult, options: RuntimeCommandOptions): void {
  const view = isCombatScreenType(result.state?.screenType)
    ? buildCombatCommandView(result, options)
    : buildCommandView(result, options);

  printCliOutput(view, { options });
}

async function inspectDeck(options: RuntimeCommandOptions): Promise<void> {
  const state = await readDisplayState();
  if (!state) {
    throw new Error("Cannot inspect deck without a live gameplay state.");
  }

  if (isCombatScreenType(state.screenType)) {
    throw new Error("inspect-deck is currently only supported from non-combat in-run screens.");
  }

  const sourceScreenType = state.screenType ?? null;
  const alreadyOpen = state.screenType === "deck_view" || state.screenType === "card_pile";
  const deckState = alreadyOpen
    ? state
    : (await sendAction("top_bar.deck", options)).state;

  if (!deckState || (deckState.screenType !== "deck_view" && deckState.screenType !== "card_pile")) {
    throw new Error(`Deck inspect expected deck_view or card_pile, got '${deckState?.screenType ?? "unknown"}'.`);
  }

  let restoredScreenType = deckState.screenType ?? null;
  if (!alreadyOpen && (deckState.actions ?? []).includes("top_bar.deck")) {
    const restored = await sendAction("top_bar.deck", options);
    restoredScreenType = restored.state?.screenType ?? restoredScreenType;
  }

  printCliOutput({
    sourceScreenType,
    restoredScreenType,
    deckView: buildGameplayView(deckState, options),
  }, { options });
}

async function main(): Promise<void> {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  switch (command) {
    case "status":
      printState(await readDisplayState(), options, { dedupe: true });
      return;
    case "inspect-deck":
      await inspectDeck(options);
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
