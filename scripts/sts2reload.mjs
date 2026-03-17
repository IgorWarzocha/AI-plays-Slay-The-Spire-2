#!/usr/bin/env node

import {
  parseArgs,
  readDisplayState,
  sendAction,
  waitForScreen,
} from "./lib/sts2-runtime.mjs";
import { buildCombatView, buildGameplayView } from "./lib/sts2-game-view.mjs";
import { waitFor } from "./lib/time.mjs";

function usage() {
  console.log(`Usage:
  sts2reload.mjs status [--relics] [--notes] [--menu] [--raw]
  sts2reload.mjs save-quit [--relics] [--notes] [--menu] [--raw]
  sts2reload.mjs continue [--relics] [--notes] [--menu] [--raw]
  sts2reload.mjs reload [--relics] [--notes] [--menu] [--raw]
`);
}

function isCombatScreen(state) {
  return state?.screenType === "combat_room" || state?.screenType === "combat_card_select";
}

function printState(state, options) {
  const view = isCombatScreen(state)
    ? buildCombatView(state, options)
    : buildGameplayView(state, options);
  console.log(JSON.stringify(view, null, 2));
}

function openPauseMenu(options) {
  const state = readDisplayState();
  if (state?.screenType === "pause_menu") {
    return state;
  }

  if (!(state?.actions ?? []).includes("top_bar.pause")) {
    throw new Error(`Cannot open pause menu from screen '${state?.screenType ?? "unknown"}'.`);
  }

  sendAction("top_bar.pause", options);
  return waitForScreen("pause_menu", { timeoutMs: options.waitTimeoutMs ?? 15000 });
}

function saveQuit(options) {
  openPauseMenu(options);
  sendAction("pause_menu.save_and_quit", { ...options, strict: false });
  return waitForScreen("main_menu", { timeoutMs: options.waitTimeoutMs ?? 20000 });
}

function continueRun(options) {
  const state = readDisplayState();
  if (state?.screenType !== "main_menu") {
    throw new Error(`Continue requires main menu, got '${state?.screenType ?? "unknown"}'.`);
  }

  sendAction("main_menu.continue", { ...options, strict: false });
  return waitForLoadedRun(options);
}

function reloadRun(options) {
  const state = readDisplayState();
  if (state?.screenType === "main_menu") {
    return continueRun(options);
  }

  saveQuit(options);
  return continueRun(options);
}

function waitForLoadedRun(options) {
  return waitForScreenChangeFrom("main_menu", options.waitTimeoutMs ?? 25000);
}

function waitForScreenChangeFrom(screenType, timeoutMs) {
  return waitFor(
    () => {
      const state = readDisplayState();
      return state?.screenType && state.screenType !== screenType && state.screenType !== "booting"
        ? state
        : null;
    },
    { timeoutMs, intervalMs: 150, description: `leave screen ${screenType}` },
  );
}

function main() {
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
