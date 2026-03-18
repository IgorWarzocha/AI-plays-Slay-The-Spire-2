import type {
  CombatViewScreen,
  DisplayState,
  GameplayView,
  RuntimeCommandOptions,
  TopBarState,
  TopBarView,
} from './types.ts';
import {
  summarizeCardBrowse,
  summarizeCharacter,
  summarizeCombat,
  summarizeMap,
  summarizePotion,
  summarizeProfile,
  summarizeRelic,
  summarizeRelicLabel,
  summarizeRunHistory,
} from './game-view-summarizers.ts';
import { buildCombatChoices, buildGameplayChoices } from './game-view-choice-builders.ts';
import { normalizeGameText, normalizeGameTextList } from './text-normalization.ts';
import { resolveViewMode, resolveViewPreferences } from './view-options.ts';

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
      notes: [],
    };
  }

  if (resolveViewMode(options) === 'full') {
    return state as unknown as GameplayView;
  }

  const viewPreferences = resolveViewPreferences(options);
  const includeRelicDetails = viewPreferences.includeRelicDetails
    || state.screenType === 'merchant_room'
    || state.screenType === 'merchant_inventory';
  const omitCardBrowseOverlayContext = viewPreferences.mode === 'easy'
    && (state.screenType === 'deck_view' || state.screenType === 'card_pile');
  const relics = includeRelicDetails
    ? (state.relics ?? []).map(summarizeRelic)
    : (state.relics ?? []).map(summarizeRelicLabel);
  const potions = (state.potions ?? [])
    .map((potion) => summarizePotion(potion, viewPreferences.mode))
    .filter((potion) => !viewPreferences.occupiedPotionsOnly || potion.occupied);

  const view: GameplayView = {
    screenType: state.screenType ?? null,
    updatedAtUtc: state.updatedAtUtc ?? null,
    topBar: buildTopBarView(state.topBar),
    ...(omitCardBrowseOverlayContext ? {} : { relics }),
    ...(omitCardBrowseOverlayContext ? {} : { potions }),
    choices: buildGameplayChoices(state, viewPreferences.mode),
  };

  if (viewPreferences.includeNotes) {
    view.notes = normalizeGameTextList(state.notes ?? []);
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
        description: normalizeGameText(state.eventDescription),
      };
      break;
    case 'map':
    case 'map_screen':
      view.map = state.map ? summarizeMap(state.map, viewPreferences.mode) : null;
      break;
    case 'combat_room':
    case 'combat_card_select':
    case 'combat_choice_select':
      view.combat = state.combat ? summarizeCombat(state.combat, viewPreferences.mode) : null;
      break;
    case 'deck_view':
    case 'card_pile':
      view.cardBrowse = state.cardBrowse ? summarizeCardBrowse(state.cardBrowse, viewPreferences.mode) : null;
      break;
    case 'run_history':
      view.runHistory = state.runHistory ? summarizeRunHistory(state.runHistory, viewPreferences.mode) : null;
      break;
    case 'merchant_room':
    case 'merchant_inventory':
      view.cardBrowse = state.cardBrowse ? summarizeCardBrowse(state.cardBrowse, viewPreferences.mode) : null;
      break;
    default:
      break;
  }

  return view;
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
      choices: [],
    };
  }

  if (resolveViewMode(options) === 'full') {
    return state as unknown as CombatViewScreen;
  }

  const viewPreferences = resolveViewPreferences(options);

  if (state.screenType !== 'combat_room'
    && state.screenType !== 'combat_card_select'
    && state.screenType !== 'combat_choice_select') {
    throw new Error(`Combat view requires a combat screen, received '${state.screenType ?? 'unknown'}'.`);
  }

  return {
    screenType: state.screenType ?? null,
    updatedAtUtc: state.updatedAtUtc ?? null,
    topBar: buildCombatTopBarView(state.topBar),
    relics: viewPreferences.includeRelicDetails
      ? (state.relics ?? []).map(summarizeRelic)
      : (state.relics ?? []).map(summarizeRelicLabel),
    notes: viewPreferences.includeNotes ? normalizeGameTextList(state.notes ?? []) : [],
    combat: state.combat ? summarizeCombat(state.combat, viewPreferences.mode) : null,
    choices: buildCombatChoices(state, viewPreferences.mode),
  };
}
