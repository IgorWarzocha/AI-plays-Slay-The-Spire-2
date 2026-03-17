import type {
  CombatCommandView,
  CombatViewScreen,
  CommandView,
  DisplayState,
  GameplayView,
  RuntimeCommandOptions,
  RunActionsResult,
  TopBarState,
  TopBarView,
} from './types.ts';
import {
  summarizeButton,
  summarizeCardBrowse,
  summarizeCharacter,
  summarizeCombat,
  summarizeCombatActionState,
  summarizeCostChange,
  summarizeMap,
  summarizeMenuItem,
  summarizePotion,
  summarizeProfile,
  summarizeRelic,
  summarizeRelicLabel,
  summarizeRunHistory,
} from './game-view-summarizers.ts';

function buildTopBarView(topBar: TopBarState | null | undefined): TopBarView | null {
  if (!topBar) {
    return null;
  }

  return {
    hp: topBar.currentHp == null || topBar.maxHp == null
      ? null
      : `${topBar.currentHp}/${topBar.maxHp}`,
    gold: topBar.gold ?? null,
    potionSlots: topBar.potionSlotCount == null ? null : {
      total: topBar.potionSlotCount,
      filled: topBar.filledPotionSlotCount ?? null,
      empty: topBar.emptyPotionSlotCount ?? null,
    },
    buttons: (topBar.buttons ?? []).map(summarizeButton),
  };
}

function buildCombatTopBarView(topBar: TopBarState | null | undefined): Pick<TopBarView, 'hp' | 'gold'> | null {
  if (!topBar) {
    return null;
  }

  return {
    hp: topBar.currentHp == null || topBar.maxHp == null
      ? null
      : `${topBar.currentHp}/${topBar.maxHp}`,
    gold: topBar.gold ?? null,
  };
}

export function buildGameplayView(state: DisplayState | null | undefined, options: RuntimeCommandOptions = {}): GameplayView {
  if (!state) {
    return {
      screenType: null,
      updatedAtUtc: null,
      topBar: null,
      relics: [],
      potions: [],
      actions: [],
      notes: [],
    };
  }

  if (options.raw === true || options.raw === 'true') {
    return state as unknown as GameplayView;
  }

  const includeActions = options.actions !== false && options.actions !== 'false';
  const includeMenuItems = options.menu === true || options.menu === 'true';
  const includeNotes = options.notes === true || options.notes === 'true';
  const includeRelicDetails = options.relics === true
    || options.relics === 'true'
    || state.screenType === 'merchant_room'
    || state.screenType === 'merchant_inventory';

  const view: GameplayView = {
    screenType: state.screenType ?? null,
    updatedAtUtc: state.updatedAtUtc ?? null,
    topBar: buildTopBarView(state.topBar),
    relics: includeRelicDetails
      ? (state.relics ?? []).map(summarizeRelic)
      : (state.relics ?? []).map(summarizeRelicLabel),
    potions: (state.potions ?? []).map(summarizePotion),
  };

  if (includeActions) {
    view.actions = state.actions ?? [];
  }

  if (includeNotes) {
    view.notes = state.notes ?? [];
  }

  switch (state.screenType) {
    case 'profile':
      view.profiles = (state.profiles ?? []).map(summarizeProfile);
      break;
    case 'character_select':
    case 'custom_run':
      view.characters = (state.characters ?? []).map(summarizeCharacter);
      view.characterSelection = state.characterSelection ?? null;
      break;
    case 'event':
      view.event = {
        title: state.eventTitle ?? null,
        description: state.eventDescription ?? null,
        options: (state.menuItems ?? []).map(summarizeMenuItem),
      };
      break;
    case 'map':
      view.map = state.map ? summarizeMap(state.map) : null;
      break;
    case 'combat_room':
    case 'combat_card_select':
    case 'combat_choice_select':
      view.combat = state.combat ? summarizeCombat(state.combat) : null;
      if ((state.menuItems ?? []).length > 0) {
        view.menuItems = (state.menuItems ?? []).map(summarizeMenuItem);
      }
      break;
    case 'deck_view':
    case 'card_pile':
      view.cardBrowse = state.cardBrowse ? summarizeCardBrowse(state.cardBrowse) : null;
      break;
    case 'run_history':
      view.runHistory = state.runHistory ? summarizeRunHistory(state.runHistory) : null;
      if (includeMenuItems || (state.menuItems ?? []).length > 0) {
        view.menuItems = (state.menuItems ?? []).map(summarizeMenuItem);
      }
      break;
    case 'merchant_room':
    case 'merchant_inventory':
      view.cardBrowse = state.cardBrowse ? summarizeCardBrowse(state.cardBrowse) : null;
      if (includeMenuItems || (state.menuItems ?? []).length > 0) {
        view.menuItems = (state.menuItems ?? []).map(summarizeMenuItem);
      }
      break;
    default:
      if (includeMenuItems || (state.menuItems ?? []).length > 0) {
        view.menuItems = (state.menuItems ?? []).map(summarizeMenuItem);
      }
      break;
  }

  return view;
}

export function buildCommandView(result: RunActionsResult, options: RuntimeCommandOptions = {}): CommandView {
  if (options.raw === true || options.raw === 'true') {
    return result as unknown as CommandView;
  }

  return {
    ok: result.ok,
    actionCount: result.actionCount,
    actions: (result.results ?? []).map((entry) => ({
      action: entry.action,
      id: entry.id,
      ackStatus: entry.ackStatus ?? entry.ack?.status ?? null,
      screenType: entry.screenType ?? null,
      costChanges: (entry.costChanges ?? []).map(summarizeCostChange),
      combatAfter: summarizeCombatActionState(entry.state ?? null),
    })),
    state: buildGameplayView(result.state, options),
  };
}

export function buildCombatView(state: DisplayState | null | undefined, options: RuntimeCommandOptions = {}): CombatViewScreen {
  if (!state) {
    return {
      screenType: null,
      updatedAtUtc: null,
      topBar: null,
      relics: [],
      notes: [],
      combat: null,
      menuItems: [],
      actions: [],
    };
  }

  if (options.raw === true || options.raw === 'true') {
    return state as unknown as CombatViewScreen;
  }

  if (state.screenType !== 'combat_room'
    && state.screenType !== 'combat_card_select'
    && state.screenType !== 'combat_choice_select') {
    throw new Error(`Combat view requires a combat screen, received '${state.screenType ?? 'unknown'}'.`);
  }

  return {
    screenType: state.screenType ?? null,
    updatedAtUtc: state.updatedAtUtc ?? null,
    topBar: buildCombatTopBarView(state.topBar),
    relics: options.relics === true || options.relics === 'true'
      ? (state.relics ?? []).map(summarizeRelic)
      : (state.relics ?? []).map(summarizeRelicLabel),
    notes: options.notes === true || options.notes === 'true' ? (state.notes ?? []) : [],
    combat: state.combat ? summarizeCombat(state.combat) : null,
    menuItems: (state.menuItems ?? []).map(summarizeMenuItem),
    actions: (state.actions ?? []).filter((action) =>
      action.startsWith('combat.')
      || action.startsWith('combat_card_select.')
      || action.startsWith('combat_choice_select.')),
  };
}

export function buildCombatCommandView(result: RunActionsResult, options: RuntimeCommandOptions = {}): CombatCommandView {
  if (options.raw === true || options.raw === 'true') {
    return result as unknown as CombatCommandView;
  }

  const state = result.state;
  const renderedState = state?.screenType === 'combat_room'
    || state?.screenType === 'combat_card_select'
    || state?.screenType === 'combat_choice_select'
    ? buildCombatView(state, options)
    : buildGameplayView(state, options);

  return {
    ok: result.ok,
    actionCount: result.actionCount,
    actions: (result.results ?? []).map((entry) => ({
      action: entry.action,
      id: entry.id,
      ackStatus: entry.ackStatus ?? entry.ack?.status ?? null,
      screenType: entry.screenType ?? null,
      costChanges: (entry.costChanges ?? []).map(summarizeCostChange),
      combatAfter: summarizeCombatActionState(entry.state ?? null),
    })),
    state: renderedState,
  };
}
