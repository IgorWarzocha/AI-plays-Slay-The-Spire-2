const BOOTSTRAP_SCOPES = new Set<string>([
  'main_menu',
  'profile',
  'singleplayer',
  'character',
  'custom_run',
]);
const HISTORY_SCOPES = new Set<string>([
  'main_menu',
  'compendium',
  'run_history',
]);
const SHARED_IN_RUN_SCOPES = new Set<string>(['card_pile']);
const COMBAT_SCOPES = new Set<string>([
  'combat',
  'combat_card_select',
  'combat_choice_select',
]);

function isExplicitTrue(value: unknown): boolean {
  return value === true || value === 'true' || value === '1';
}

export function getActionScope(action: string): string {
  const [scope] = String(action ?? '').split('.', 1);
  return scope ?? '';
}

export function isBootstrapAction(action: string): boolean {
  return BOOTSTRAP_SCOPES.has(getActionScope(action));
}

export function isCombatAction(action: string): boolean {
  return COMBAT_SCOPES.has(getActionScope(action));
}

export function isHistoryAction(action: string): boolean {
  return HISTORY_SCOPES.has(getActionScope(action));
}

export function isSharedInRunAction(action: string): boolean {
  return SHARED_IN_RUN_SCOPES.has(getActionScope(action));
}

export function assertGameplayActions(actions: readonly string[]): void {
  const invalid = actions.filter(
    (action) => isBootstrapAction(action) || (isCombatAction(action) && !isSharedInRunAction(action)),
  );
  if (invalid.length > 0) {
    throw new Error(
      `sts2ctl.ts only accepts non-combat in-run actions. Use sts2run.ts for bootstrap actions or sts2combat.ts for combat actions: ${invalid.join(', ')}`,
    );
  }
}

export function assertBootstrapActions(actions: readonly string[]): void {
  const invalid = actions.filter((action) => !isBootstrapAction(action));
  if (invalid.length > 0) {
    throw new Error(
      `sts2run.ts only accepts bootstrap actions. Use sts2ctl.ts for in-run actions: ${invalid.join(', ')}`,
    );
  }
}

export function assertCombatActions(
  actions: readonly string[],
  options: { batch?: boolean | string } = {},
): void {
  const invalid = actions.filter((action) => !isCombatAction(action) && !isSharedInRunAction(action));
  if (invalid.length > 0) {
    throw new Error(
      `sts2combat.ts only accepts combat actions. Use sts2ctl.ts for non-combat in-run actions or sts2run.ts for bootstrap actions: ${invalid.join(', ')}`,
    );
  }

  if (actions.length > 1 && !isExplicitTrue(options.batch)) {
    throw new Error('sts2combat.ts requires --batch for multiple combat actions.');
  }
}

export function assertHistoryActions(actions: readonly string[]): void {
  const invalid = actions.filter((action) => !isHistoryAction(action));
  if (invalid.length > 0) {
    throw new Error(
      `sts2history.ts only accepts compendium/run-history actions: ${invalid.join(', ')}`,
    );
  }
}
