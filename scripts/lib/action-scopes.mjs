const BOOTSTRAP_SCOPES = new Set([
  "main_menu",
  "profile",
  "singleplayer",
  "character",
  "custom_run",
]);
const SHARED_IN_RUN_SCOPES = new Set(["card_pile"]);
const COMBAT_SCOPES = new Set([
  "combat",
  "combat_card_select",
  "combat_choice_select",
]);

export function getActionScope(action) {
  const [scope] = String(action ?? "").split(".", 1);
  return scope ?? "";
}

export function isBootstrapAction(action) {
  return BOOTSTRAP_SCOPES.has(getActionScope(action));
}

export function isCombatAction(action) {
  return COMBAT_SCOPES.has(getActionScope(action));
}

export function isSharedInRunAction(action) {
  return SHARED_IN_RUN_SCOPES.has(getActionScope(action));
}

export function assertGameplayActions(actions) {
  const invalid = actions.filter(
    (action) => isBootstrapAction(action) || (isCombatAction(action) && !isSharedInRunAction(action)),
  );
  if (invalid.length > 0) {
    throw new Error(
      `sts2ctl.mjs only accepts non-combat in-run actions. Use sts2run.mjs for bootstrap actions or sts2combat.mjs for combat actions: ${invalid.join(", ")}`,
    );
  }
}

export function assertBootstrapActions(actions) {
  const invalid = actions.filter((action) => !isBootstrapAction(action));
  if (invalid.length > 0) {
    throw new Error(
      `sts2run.mjs only accepts bootstrap actions. Use sts2ctl.mjs for in-run actions: ${invalid.join(", ")}`,
    );
  }
}

export function assertCombatActions(actions) {
  const invalid = actions.filter((action) => !isCombatAction(action) && !isSharedInRunAction(action));
  if (invalid.length > 0) {
    throw new Error(
      `sts2combat.mjs only accepts combat actions. Use sts2ctl.mjs for non-combat in-run actions or sts2run.mjs for bootstrap actions: ${invalid.join(", ")}`,
    );
  }
}
