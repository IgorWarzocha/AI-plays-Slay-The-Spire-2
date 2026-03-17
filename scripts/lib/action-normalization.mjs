function normalizeMerchantEntryId(entryId) {
  if (typeof entryId !== "string") {
    return "";
  }

  return entryId.replace(/^([a-z]+)-\d{2}-/i, "$1-");
}

function stripPotionSlotPrefix(potionId) {
  if (typeof potionId !== "string") {
    return "";
  }

  return potionId.replace(/^potion-\d+:/i, "");
}

function parsePotionAction(action) {
  if (typeof action !== "string") {
    return null;
  }

  const prefixes = [
    "combat.use_potion:",
    "combat.discard_potion:",
    "potions.use:",
    "potions.discard:",
  ];

  const prefix = prefixes.find((candidate) => action.startsWith(candidate));
  if (!prefix) {
    return null;
  }

  const remainder = action.slice(prefix.length);
  const [potionId, target = ""] = remainder.split("@", 2);
  return {
    prefix,
    potionId,
    target,
  };
}

function normalizePotionActionForCurrentState(action, state) {
  const parsed = parsePotionAction(action);
  if (!parsed) {
    return action;
  }

  const availableActions = Array.isArray(state?.actions) ? state.actions : [];
  if (availableActions.includes(action)) {
    return action;
  }

  const targetPotion = stripPotionSlotPrefix(parsed.potionId);
  const matches = availableActions
    .filter((candidate) => candidate.startsWith(parsed.prefix))
    .filter((candidate) => {
      const candidateParsed = parsePotionAction(candidate);
      if (!candidateParsed) {
        return false;
      }

      if (stripPotionSlotPrefix(candidateParsed.potionId) !== targetPotion) {
        return false;
      }

      if (parsed.target && candidateParsed.target !== parsed.target) {
        return false;
      }

      return true;
    });

  return matches.length === 1 ? matches[0] : action;
}

export function normalizeActionForCurrentState(action, state) {
  // The exporter can renumber merchant slots and potion slots after a state
  // change. Re-resolving against the latest surfaced actions keeps callers
  // stable without forcing every CLI surface to understand those shifts.
  if (typeof action !== "string") {
    return action;
  }

  if (action.startsWith("merchant.buy:")) {
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

  return normalizePotionActionForCurrentState(action, state);
}
