import fs from "node:fs";

import { readAck, readState } from "./game-state.mjs";
import { STS2_RUNTIME_PATHS } from "./runtime-paths.mjs";
import { waitFor } from "./time.mjs";
import { launchGame } from "./process-manager.mjs";

function stableJson(value) {
  return JSON.stringify(value ?? null);
}

function createCommandId() {
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isExplicitFalse(value) {
  return value === false || value === "false" || value === "0";
}

function isCombatStateSettled(state) {
  if (!state || (state.screenType !== "combat_room" && state.screenType !== "combat_card_select")) {
    return true;
  }

  const combat = state.combat;
  if (!combat) {
    return false;
  }

  return combat.handIsSettled !== false;
}

function waitForSettledCombatState({ timeoutMs = 2500 } = {}) {
  return waitFor(
    () => {
      const state = readState();
      return state && isCombatStateSettled(state) ? state : null;
    },
    { timeoutMs, intervalMs: 120, description: "settled combat state" },
  );
}

export function writeCommand(command) {
  fs.mkdirSync(STS2_RUNTIME_PATHS.agentDir, { recursive: true });
  fs.writeFileSync(STS2_RUNTIME_PATHS.commandPath, `${JSON.stringify(command, null, 2)}\n`);
  return command.id;
}

export function waitForAck(id, { timeoutMs = 10000 } = {}) {
  return waitFor(
    () => {
      const ack = readAck();
      return ack && ack.id === id ? ack : null;
    },
    { timeoutMs, intervalMs: 150, description: `ack ${id}` },
  );
}

export function waitForCommandSettlement(id, beforeState, { timeoutMs = 6000 } = {}) {
  const beforeJson = stableJson(beforeState);
  const beforeUpdatedAt = beforeState?.updatedAtUtc ?? null;

  return waitFor(
    () => {
      const ack = readAck();
      if (ack?.id === id && ack.status === "error") {
        throw new Error(ack.message ?? `Command ${id} failed.`);
      }

      const ackCompleted = ack?.id === id && ack.status !== "pending";
      const state = readState();
      if (!state || state.lastHandledCommandId !== id) {
        return null;
      }

      if (!ackCompleted || !isCombatStateSettled(state)) {
        return null;
      }

      const afterJson = stableJson(state);
      const updatedChanged = state.updatedAtUtc && state.updatedAtUtc !== beforeUpdatedAt;
      return updatedChanged && afterJson !== beforeJson ? { ack, state } : null;
    },
    { timeoutMs, intervalMs: 150, description: `command ${id} state mutation` },
  );
}

export function waitForFollowThrough(action, beforeState, { timeoutMs = 6000 } = {}) {
  if (action !== "combat.end_turn") {
    return null;
  }

  const beforeRoundNumber = beforeState?.combat?.roundNumber ?? null;
  const beforeUpdatedAt = beforeState?.updatedAtUtc ?? null;

  return waitFor(
    () => {
      const state = readState();
      if (!state?.updatedAtUtc || state.updatedAtUtc === beforeUpdatedAt) {
        return null;
      }

      if (state.screenType !== "combat_room") {
        return state;
      }

      const combat = state.combat;
      if (!combat) {
        return state;
      }

      if (combat.currentSide !== "Player") {
        return null;
      }

      if (beforeRoundNumber === null || combat.roundNumber > beforeRoundNumber) {
        const handCount = Array.isArray(combat.hand) ? combat.hand.length : 0;
        const visibleMenuCount = Array.isArray(state.menuItems) ? state.menuItems.length : 0;
        if ((handCount > 0 || visibleMenuCount > 0) && isCombatStateSettled(state)) {
          return state;
        }
      }

      return null;
    },
    { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
  );
}

export function waitForScreen(screenType, { timeoutMs = 15000 } = {}) {
  return waitFor(
    () => {
      const state = readState();
      return state?.screenType === screenType ? state : null;
    },
    { timeoutMs, intervalMs: 150, description: `screen ${screenType}` },
  );
}

export function sendAction(action, options = {}) {
  const id = options.id ?? createCommandId();
  const beforeState = readState();
  const payload = {
    id,
    action,
    ...(options.character ? { character: options.character } : {}),
    ...(options.seed ? { seed: options.seed } : {}),
    ...(options.act1 ? { act1: options.act1 } : {}),
  };

  writeCommand(payload);
  const ack = waitForAck(id);
  if (ack.status === "error") {
    throw new Error(ack.message ?? `Command ${action} failed.`);
  }

  if (isExplicitFalse(options.strict)) {
    return { action, id, ack, settled: false, state: readState() };
  }

  const result = waitForCommandSettlement(id, beforeState, {
    timeoutMs: Number(options["settle-timeout-ms"] ?? options.settleTimeoutMs ?? 6000),
  });
  const followThroughState = waitForFollowThrough(action, beforeState, {
    timeoutMs: Number(options["follow-through-timeout-ms"] ?? options.followThroughTimeoutMs ?? 6000),
  });
  const finalState = followThroughState
    ?? result.state
    ?? (() => {
      try {
        return waitForSettledCombatState();
      } catch {
        return readState();
      }
    })();

  return {
    action,
    id,
    ack,
    settled: true,
    ackStatus: ack.status,
    screenType: finalState?.screenType ?? null,
    state: finalState,
  };
}

export function runActions(actions, options = {}) {
  const results = [];

  for (const action of actions) {
    results.push(sendAction(action, {
      ...options,
      id: actions.length === 1 ? options.id : undefined,
    }));
  }

  return {
    ok: true,
    actionCount: results.length,
    results,
    state: results.at(-1)?.state ?? readState(),
  };
}

export function startStandardRun(options = {}) {
  launchGame();
  waitForScreen("main_menu", { timeoutMs: 60000 });
  sendAction("main_menu.singleplayer", { id: `cmd-${Date.now()}-menu` });
  waitForScreen("singleplayer_submenu");
  sendAction("singleplayer.standard", { id: `cmd-${Date.now()}-singleplayer` });
  waitForScreen("character_select");
  const ack = sendAction("character.start_run", {
    id: `cmd-${Date.now()}-start`,
    character: options.character ?? "ironclad",
    seed: options.seed,
    act1: options.act1 ?? "act1",
  });

  waitFor(
    () => {
      const state = readState();
      return state && state.screenType !== "character_select" ? state : null;
    },
    { timeoutMs: 20000, intervalMs: 250, description: "run to leave character select" },
  );

  return ack;
}
