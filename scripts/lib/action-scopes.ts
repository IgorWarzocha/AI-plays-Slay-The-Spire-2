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

export type CommandSurface = 'bootstrap' | 'gameplay' | 'combat';

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

export function isCombatScreenType(screenType: string | null | undefined): boolean {
  return screenType === 'combat_room'
    || screenType === 'combat_card_select'
    || screenType === 'combat_choice_select';
}

export function resolveCommandSurface(
  actions: readonly string[],
  currentScreenType: string | null | undefined = null,
): CommandSurface {
  let sawBootstrap = false;
  let sawCombat = false;
  let sawGameplay = false;
  let sawHistory = false;
  let sawSharedOnly = false;

  for (const action of actions) {
    if (isBootstrapAction(action)) {
      sawBootstrap = true;
      continue;
    }

    if (isHistoryAction(action)) {
      sawHistory = true;
      continue;
    }

    if (isCombatAction(action)) {
      sawCombat = true;
      continue;
    }

    if (isSharedInRunAction(action)) {
      sawSharedOnly = true;
      continue;
    }

    sawGameplay = true;
  }

  if (sawHistory) {
    throw new Error('History actions are not supported by sts2play.ts. Use sts2history.ts instead.');
  }

  if (sawBootstrap && (sawCombat || sawGameplay || sawSharedOnly)) {
    throw new Error('Cannot mix bootstrap actions with in-run actions in one sts2play.ts command.');
  }

  if (sawCombat && sawGameplay) {
    throw new Error('Cannot mix combat and non-combat in-run actions in one sts2play.ts command.');
  }

  if (sawCombat) {
    return 'combat';
  }

  if (sawBootstrap) {
    return 'bootstrap';
  }

  if (!sawGameplay && sawSharedOnly) {
    return isCombatScreenType(currentScreenType) ? 'combat' : 'gameplay';
  }

  return 'gameplay';
}

export function assertGameplayActions(actions: readonly string[]): void {
  const invalid = actions.filter(
    (action) => isBootstrapAction(action) || (isCombatAction(action) && !isSharedInRunAction(action)),
  );
  if (invalid.length > 0) {
    throw new Error(
      `sts2ctl.ts only accepts non-combat in-run actions. Use sts2play.ts for auto-routing, sts2run.ts for bootstrap actions, or sts2combat.ts for combat actions: ${invalid.join(', ')}`,
    );
  }
}

export function assertBootstrapActions(actions: readonly string[]): void {
  const invalid = actions.filter((action) => !isBootstrapAction(action));
  if (invalid.length > 0) {
    throw new Error(
      `sts2run.ts only accepts bootstrap actions. Use sts2play.ts for auto-routing or sts2ctl.ts for in-run actions: ${invalid.join(', ')}`,
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
      `sts2combat.ts only accepts combat actions. Use sts2play.ts for auto-routing, sts2ctl.ts for non-combat in-run actions, or sts2run.ts for bootstrap actions: ${invalid.join(', ')}`,
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
