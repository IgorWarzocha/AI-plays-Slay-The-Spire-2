import fs from "node:fs";

import { readAck, readState } from "./game-state.mjs";
import { STS2_RUNTIME_PATHS } from "./runtime-paths.mjs";
import { waitFor } from "./time.mjs";
import { launchGame } from "./process-manager.mjs";

function stableJson(value) {
  return JSON.stringify(value ?? null);
}

function isCombatLikeScreen(screenType) {
  return screenType === "combat_room"
    || screenType === "combat_card_select"
    || screenType === "combat_choice_select";
}

function createCommandId() {
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isExplicitFalse(value) {
  return value === false || value === "false" || value === "0";
}

function normalizeMerchantEntryId(entryId) {
  if (typeof entryId !== "string") {
    return "";
  }

  return entryId.replace(/^([a-z]+)-\d{2}-/i, "$1-");
}

export function normalizeActionForCurrentState(action, state) {
  if (typeof action !== "string" || !action.startsWith("merchant.buy:")) {
    return action;
  }

  const availableActions = Array.isArray(state?.actions) ? state.actions : [];
  if (availableActions.includes(action)) {
    return action;
  }

  const targetId = action.slice("merchant.buy:".length);
  const normalizedTarget = normalizeMerchantEntryId(targetId);
  const matches = availableActions
    .filter((candidate) => candidate.startsWith("merchant.buy:"))
    .filter((candidate) =>
      normalizeMerchantEntryId(candidate.slice("merchant.buy:".length)) === normalizedTarget);

  return matches.length === 1 ? matches[0] : action;
}

function isCombatStateSettled(state) {
  if (!state || !isCombatLikeScreen(state.screenType)) {
    return true;
  }

  if (state.screenType === "combat_choice_select") {
    return true;
  }

  const combat = state.combat;
  if (!combat) {
    return false;
  }

  return combat.handIsSettled === true;
}

function parseInstant(value) {
  if (!value || typeof value !== "string") {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function isNewerState(referenceState, state) {
  if (!state?.updatedAtUtc) {
    return false;
  }

  return parseInstant(state.updatedAtUtc) > parseInstant(referenceState?.updatedAtUtc);
}

function hasStateMutated(beforeState, state) {
  if (!state) {
    return false;
  }

  const beforeUpdatedAt = beforeState?.updatedAtUtc ?? null;
  const updatedChanged = state.updatedAtUtc && state.updatedAtUtc !== beforeUpdatedAt;
  return updatedChanged && stableJson(state) !== stableJson(beforeState);
}

export function isInteractiveFollowUpTransition(beforeState, state, ack) {
  if (!beforeState || !state || !ack || ack.status !== "pending") {
    return false;
  }

  if (!hasStateMutated(beforeState, state)) {
    return false;
  }

  return state.screenType !== beforeState.screenType;
}

export function isRewardPotionClaimFollowThroughState(action, beforeState, state) {
  if (!action?.startsWith("rewards.claim:reward-Potion-")) {
    return false;
  }

  if (!beforeState || !state || !isNewerState(beforeState, state)) {
    return false;
  }

  return stableJson({
    screenType: state.screenType,
    potions: state.potions ?? [],
    menuItems: state.menuItems ?? [],
  }) !== stableJson({
    screenType: beforeState.screenType,
    potions: beforeState.potions ?? [],
    menuItems: beforeState.menuItems ?? [],
  });
}

export function buildCombatStabilityKey(state) {
  if (!state || !isCombatLikeScreen(state.screenType)) {
    return JSON.stringify({ screenType: state?.screenType ?? null });
  }

  const combat = state.combat ?? {};
  return JSON.stringify({
    screenType: state.screenType,
    roundNumber: combat.roundNumber ?? null,
    currentSide: combat.currentSide ?? null,
    energy: combat.energy ?? null,
    handIds: Array.isArray(combat.hand) ? combat.hand.map((card) => card.id) : [],
    handPlayable: Array.isArray(combat.hand) ? combat.hand.map((card) => Boolean(card.isPlayable)) : [],
    menuItemIds: Array.isArray(state.menuItems) ? state.menuItems.map((item) => item.id) : [],
    drawPileCount: combat.drawPileCount ?? null,
    discardPileCount: combat.discardPileCount ?? null,
    exhaustPileCount: combat.exhaustPileCount ?? null,
    selectionMode: combat.selectionMode ?? null,
    selectionPrompt: combat.selectionPrompt ?? null,
    creatureIntents: Array.isArray(combat.creatures)
      ? combat.creatures.map((creature) => ({
          id: creature.id,
          hp: creature.currentHp ?? null,
          block: creature.block ?? null,
          intents: Array.isArray(creature.intents)
            ? creature.intents.map((intent) => ({
                kind: intent.kind,
                label: intent.label,
                targets: intent.targets ?? [],
              }))
            : [],
        }))
      : [],
  });
}

export function isCombatDisplayStable(state, { quietPeriodMs = 500 } = {}) {
  if (!isCombatStateSettled(state)) {
    return false;
  }

  const updatedAt = parseInstant(state?.updatedAtUtc);
  return Number.isFinite(updatedAt) && Date.now() - updatedAt >= quietPeriodMs;
}

export function isPotionUseFollowThroughState(action, referenceState, state) {
  if (!action?.startsWith("potions.use:")) {
    return false;
  }

  if (!referenceState || !state || !isNewerState(referenceState, state)) {
    return false;
  }

  return stableJson({
    screenType: state.screenType,
    hp: state.topBar?.hp ?? null,
    potions: state.potions ?? [],
  }) !== stableJson({
    screenType: referenceState.screenType,
    hp: referenceState.topBar?.hp ?? null,
    potions: referenceState.potions ?? [],
  });
}

export function detectCombatCostChanges(beforeState, afterState) {
  if (!isCombatLikeScreen(beforeState?.screenType) || !isCombatLikeScreen(afterState?.screenType)) {
    return [];
  }

  const beforeHand = new Map(
    (beforeState?.combat?.hand ?? []).map((card) => [card.id, card]),
  );

  return (afterState?.combat?.hand ?? [])
    .flatMap((afterCard) => {
      const beforeCard = beforeHand.get(afterCard.id);
      if (!beforeCard) {
        return [];
      }

      const beforeCost = beforeCard.costText ?? null;
      const afterCost = afterCard.costText ?? null;
      if (beforeCost === afterCost) {
        return [];
      }

      return [{
        cardId: afterCard.id,
        title: afterCard.title ?? null,
        beforeCost,
        afterCost,
      }];
    });
}

function waitForSettledCombatState({ timeoutMs = 2500, quietPeriodMs = 500, stableSamples = 3 } = {}) {
  let stableKey = null;
  let stableCount = 0;

  return waitFor(
    () => {
      const state = readState();
      if (!state || !isCombatDisplayStable(state, { quietPeriodMs })) {
        stableKey = null;
        stableCount = 0;
        return null;
      }

      const key = buildCombatStabilityKey(state);
      if (key === stableKey) {
        stableCount += 1;
      } else {
        stableKey = key;
        stableCount = 1;
      }

      return stableCount >= stableSamples ? state : null;
    },
    { timeoutMs, intervalMs: 120, description: "stable combat state" },
  );
}

export function readDisplayState({ timeoutMs = 2500 } = {}) {
  const state = readState();
  if (!state) {
    return null;
  }

  if (!isCombatLikeScreen(state.screenType)) {
    return state;
  }

  if (isCombatStateSettled(state)) {
    return state;
  }

  return waitForSettledCombatState({ timeoutMs });
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

      if (isInteractiveFollowUpTransition(beforeState, state, ack)) {
        return { ack, state };
      }

      if (!ackCompleted || !isCombatStateSettled(state)) {
        return null;
      }

      return hasStateMutated(beforeState, state) ? { ack, state } : null;
    },
    { timeoutMs, intervalMs: 150, description: `command ${id} state mutation` },
  );
}

export function waitForFollowThrough(action, beforeState, { timeoutMs = 6000 } = {}) {
  if (action.startsWith("rewards.claim:reward-Potion-")) {
    return waitFor(
      () => {
        const state = readState();
        return isRewardPotionClaimFollowThroughState(action, beforeState, state) ? state : null;
      },
      { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
    );
  }

  if (action.startsWith("potions.use:")) {
    const referenceState = readState() ?? beforeState;
    return waitFor(
      () => {
        const state = readState();
        return isPotionUseFollowThroughState(action, referenceState, state) ? state : null;
      },
      { timeoutMs, intervalMs: 200, description: `${action} follow-through` },
    );
  }

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
  const resolvedAction = normalizeActionForCurrentState(action, beforeState);
  const payload = {
    id,
    action: resolvedAction,
    ...(options.character ? { character: options.character } : {}),
    ...(options.seed ? { seed: options.seed } : {}),
    ...(options.act1 ? { act1: options.act1 } : {}),
  };

  writeCommand(payload);
  const ack = waitForAck(id);
  if (ack.status === "error") {
    throw new Error(ack.message ?? `Command ${resolvedAction} failed.`);
  }

  if (isExplicitFalse(options.strict)) {
    return { action, id, ack, settled: false, state: readState() };
  }

  const result = waitForCommandSettlement(id, beforeState, {
    timeoutMs: Number(options["settle-timeout-ms"] ?? options.settleTimeoutMs ?? 6000),
  });
  const followThroughState = waitForFollowThrough(resolvedAction, beforeState, {
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
  const finalAck = readAck();

  return {
    action,
    resolvedAction,
    id,
    ack: finalAck?.id === id ? finalAck : ack,
    settled: true,
    ackStatus: finalAck?.id === id ? finalAck.status : ack.status,
    screenType: finalState?.screenType ?? null,
    costChanges: detectCombatCostChanges(beforeState, finalState),
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
  sendAction("character.start_run", {
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

  return readState();
}
