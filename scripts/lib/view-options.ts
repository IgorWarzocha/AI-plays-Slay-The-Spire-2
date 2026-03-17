import type { RuntimeCommandOptions } from './types.ts';

export type ViewMode = 'easy' | 'hard' | 'full';

export interface ViewPreferences {
  mode: Exclude<ViewMode, 'full'>;
  includeActions: boolean;
  includeMenuItems: boolean;
  includeNotes: boolean;
  includeRelicDetails: boolean;
  compactCombat: boolean;
  compactCollections: boolean;
  occupiedPotionsOnly: boolean;
}

export function isExplicitTrue(value: unknown): boolean {
  return value === true || value === 'true' || value === '1';
}

function isExplicitFalse(value: unknown): boolean {
  return value === false || value === 'false' || value === '0';
}

export function resolveViewMode(options: RuntimeCommandOptions = {}): ViewMode {
  const requestedModes: ViewMode[] = [];

  if (isExplicitTrue(options.easy)) {
    requestedModes.push('easy');
  }
  if (isExplicitTrue(options.hard)) {
    requestedModes.push('hard');
  }
  if (isExplicitTrue(options.full) || isExplicitTrue(options.raw)) {
    requestedModes.push('full');
  }

  if (requestedModes.length > 1) {
    throw new Error(`Choose only one view mode: ${requestedModes.join(', ')}.`);
  }

  if (requestedModes.length === 1) {
    return requestedModes[0] ?? 'easy';
  }

  if (isExplicitTrue(options.notes)
    || isExplicitTrue(options.menu)
    || isExplicitTrue(options.relics)
    || isExplicitTrue(options.actions)) {
    return 'hard';
  }

  return 'easy';
}

export function resolveViewPreferences(options: RuntimeCommandOptions = {}): ViewPreferences {
  const mode = resolveViewMode(options);
  if (mode === 'full') {
    throw new Error('Full mode should be handled before resolving compact view preferences.');
  }

  const easyDefaults: ViewPreferences = {
    mode,
    includeActions: false,
    includeMenuItems: false,
    includeNotes: false,
    includeRelicDetails: false,
    compactCombat: true,
    compactCollections: true,
    occupiedPotionsOnly: true,
  };

  const hardDefaults: ViewPreferences = {
    mode,
    includeActions: true,
    includeMenuItems: true,
    includeNotes: true,
    includeRelicDetails: true,
    compactCombat: false,
    compactCollections: false,
    occupiedPotionsOnly: false,
  };

  const defaults = mode === 'hard' ? hardDefaults : easyDefaults;

  return {
    mode,
    includeActions: isExplicitFalse(options.actions)
      ? false
      : (isExplicitTrue(options.actions) ? true : defaults.includeActions),
    includeMenuItems: isExplicitFalse(options.menu)
      ? false
      : (isExplicitTrue(options.menu) ? true : defaults.includeMenuItems),
    includeNotes: isExplicitFalse(options.notes)
      ? false
      : (isExplicitTrue(options.notes) ? true : defaults.includeNotes),
    includeRelicDetails: isExplicitFalse(options.relics)
      ? false
      : (isExplicitTrue(options.relics) ? true : defaults.includeRelicDetails),
    compactCombat: defaults.compactCombat,
    compactCollections: defaults.compactCollections,
    occupiedPotionsOnly: defaults.occupiedPotionsOnly,
  };
}
