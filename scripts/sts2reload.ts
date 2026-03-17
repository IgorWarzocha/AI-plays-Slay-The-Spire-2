#!/usr/bin/env node

import {
  parseArgs,
  readDisplayState,
  sendAction,
  waitForScreen,
} from "./lib/sts2-runtime.ts";
import { buildCombatView, buildGameplayView } from "./lib/sts2-game-view.ts";
import { waitFor } from "./lib/time.ts";
import type { DisplayState, RuntimeCommandOptions } from "./lib/types.ts";

function usage(): void {
  console.log(`Usage:
  sts2reload.ts status [--relics] [--notes] [--menu] [--raw]
  sts2reload.ts save-quit [--relics] [--notes] [--menu] [--raw]
  sts2reload.ts continue [--relics] [--notes] [--menu] [--raw]
  sts2reload.ts reload [--relics] [--notes] [--menu] [--raw]
`);
}

function isCombatScreen(state: DisplayState | null | undefined): boolean {
  return state?.screenType === "combat_room" || state?.screenType === "combat_card_select";
}

function printState(state: DisplayState | null | undefined, options: RuntimeCommandOptions): void {
  const view = isCombatScreen(state)
    ? buildCombatView(state, options)
    : buildGameplayView(state, options);
  console.log(JSON.stringify(view, null, 2));
}

function readWaitTimeout(value: RuntimeCommandOptions['waitTimeoutMs'], fallback: number): number {
  return typeof value === 'string' || typeof value === 'number'
    ? Number(value)
    : fallback;
}

function openPauseMenu(options: RuntimeCommandOptions): DisplayState {
  const state = readDisplayState();
  if (state?.screenType === "pause_menu") {
    return state;
  }

  if (!(state?.actions ?? []).includes("top_bar.pause")) {
    throw new Error(`Cannot open pause menu from screen '${state?.screenType ?? "unknown"}'.`);
  }

  sendAction("top_bar.pause", options);
  return waitForScreen("pause_menu", { timeoutMs: readWaitTimeout(options.waitTimeoutMs, 15000) });
}

function saveQuit(options: RuntimeCommandOptions): DisplayState {
  openPauseMenu(options);
  sendAction("pause_menu.save_and_quit", { ...options, strict: false });
  return waitForScreen("main_menu", { timeoutMs: readWaitTimeout(options.waitTimeoutMs, 20000) });
}

function continueRun(options: RuntimeCommandOptions): DisplayState {
  const state = readDisplayState();
  if (state?.screenType !== "main_menu") {
    throw new Error(`Continue requires main menu, got '${state?.screenType ?? "unknown"}'.`);
  }

  sendAction("main_menu.continue", { ...options, strict: false });
  return waitForLoadedRun(options);
}

function reloadRun(options: RuntimeCommandOptions): DisplayState {
  const state = readDisplayState();
  if (state?.screenType === "main_menu") {
    return continueRun(options);
  }

  saveQuit(options);
  return continueRun(options);
}

function waitForLoadedRun(options: RuntimeCommandOptions): DisplayState {
  return waitForLoadedRunSurface(readWaitTimeout(options.waitTimeoutMs, 25000));
}

function isLoadedRunSurface(state: DisplayState | null | undefined): state is DisplayState {
  if (!state?.screenType) {
    return false;
  }

  if (state.screenType === "booting" || state.screenType === "main_menu" || state.screenType === "run_active") {
    return false;
  }

  return true;
}

function waitForLoadedRunSurface(timeoutMs: number): DisplayState {
  return waitFor(
    () => {
      try {
        const state = readDisplayState({ timeoutMs: Math.min(timeoutMs, 5000) });
        return isLoadedRunSurface(state) ? state : null;
      } catch (error) {
        if (error instanceof Error && error.message.includes("stable combat state")) {
          return null;
        }

        throw error;
      }
    },
    { timeoutMs, intervalMs: 150, description: "usable resumed run surface" },
  );
}

function main(): void {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  switch (command) {
    case "status":
      printState(readDisplayState(), options);
      return;
    case "save-quit":
      printState(saveQuit(options), options);
      return;
    case "continue":
      printState(continueRun(options), options);
      return;
    case "reload":
      printState(reloadRun(options), options);
      return;
    default:
      usage();
      if (command) {
        process.exitCode = 1;
      }
  }
}

main();
