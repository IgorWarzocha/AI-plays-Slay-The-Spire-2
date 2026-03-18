import type {
  CharacterState,
  CreaturePowerState,
  ProfileState,
  RelicState,
} from './display.ts';
import type { CombatCostChange } from './runtime.ts';

export interface ButtonView {
  id: string;
  enabled: boolean | undefined;
  selected: boolean | undefined;
}

export interface TopBarView {
  hp: string | null;
  gold: number | null;
  potionSlots?: {
    total: number;
    filled: number | null;
    empty: number | null;
  } | null;
  buttons?: ButtonView[];
}

export interface MenuItemView {
  id: string;
  label: string | undefined;
  description: string | null;
  enabled: boolean | undefined;
  selected: boolean | undefined;
}

export interface ChoiceView {
  action: string;
  label?: string;
  description?: string;
  enabled?: boolean;
  selected?: boolean;
}

export interface CardOverlayView {
  kind: string;
  type: string | null;
  title: string | null;
  description: string | null;
  extraCardText: string | null;
  amount: number | null;
  status: string | null;
  overlayPath: string | null;
  glowsGold: boolean | null;
  glowsRed: boolean | null;
}

export interface UnplayableView {
  reason: string | null;
  preventerType: string | null;
  preventerTitle: string | null;
  preventerDescription: string | null;
}

export interface CombatCardView {
  id: string;
  title: string | undefined;
  cost: string | null;
  description: string | null;
  playable: boolean | undefined;
  affliction: CardOverlayView | null;
  enchantment: CardOverlayView | null;
  unplayable: UnplayableView | null;
  glowsGold: boolean;
  glowsRed: boolean;
  targets: string[];
  upgraded: boolean | undefined;
}

export interface PotionView {
  id: string;
  slot: number | null;
  occupied: boolean;
  title: string;
  description: string | null;
  usable: boolean | undefined;
  discardable: boolean | undefined;
  usage: string | null;
  targets: string[];
}

export interface CreatureIntentView {
  kind: string;
  label: string | null;
  title: string | null;
  description: string | null;
  summary: string | null;
  targets: string[];
}

export interface CreatureView {
  id: string;
  name: string;
  side: string;
  hp: string;
  block: number | undefined;
  powers: CreaturePowerState[];
  intents: CreatureIntentView[];
}

export interface CombatViewData {
  roundNumber: number | null;
  currentSide: string | null;
  energy: number | null;
  handIsSettled: boolean | null;
  handMeta: {
    active: number | null;
    total: number | null;
    pending: number | null;
    animating: boolean | null;
    cardPlayInProgress: boolean | null;
  } | null;
  piles: {
    draw: number | null;
    discard: number | null;
    exhaust: number | null;
  };
  canEndTurn: boolean | undefined;
  selectionMode: string | null;
  selectionPrompt: string | null;
  hand: CombatCardView[];
  potions: PotionView[];
  creatures: CreatureView[];
}

export interface CombatActionStateView {
  screenType: string | null;
  updatedAtUtc: string | null;
  combat: CombatViewData | null;
}

export interface MapPointView {
  id: string;
  coord: string;
  type: string | null | undefined;
  state: string | null | undefined;
  travelable: boolean | undefined;
  canModify?: boolean | null;
}

export interface MapRowView {
  row: number;
  nodes: MapPointView[];
}

export interface MapView {
  visible: boolean | undefined;
  travelEnabled: boolean | undefined;
  traveling: boolean | undefined;
  boss: string | null;
  current: MapPointView | null;
  travelablePoints: MapPointView[];
  traveledCount: number;
  pointCount: number;
  rows: MapRowView[];
}

export interface CardBrowseView {
  kind: string;
  title: string;
  pileType: string | null;
  cardCount: number;
  canClose: boolean;
  cards: CombatCardView[];
}

export interface RunHistoryFloorView {
  floor: number;
  mapPointType: string | null;
  hp: string | null;
  gold: number | null;
  damageTaken: number | null;
  hpHealed: number | null;
  goldGained: number | null;
  goldSpent: number | null;
  rooms: Array<{
    roomType: string | null;
    modelId: string | null;
    turnsTaken: number | null;
    monsterIds: string[];
  }>;
  cardsGained: string[];
  cardsRemoved: string[];
  cardsTransformed: Array<{ from: string | null; to: string | null }>;
  upgradedCards: string[];
  downgradedCards: string[];
  boughtRelics: string[];
  boughtPotions: string[];
  potionUsed: string[];
  potionDiscarded: string[];
  restSiteChoices: string[];
  cardChoices: Array<{ label: string; picked: boolean }>;
  relicChoices: Array<{ label: string; picked: boolean }>;
  potionChoices: Array<{ label: string; picked: boolean }>;
  ancientChoices: Array<{ label: string; picked: boolean }>;
  eventChoices: string[];
}

export interface RunHistoryDeckCardView {
  id: string | undefined;
  title: string;
  cost: string | null;
  upgraded: boolean;
  count: number;
  floorsAdded: number[];
  description: string | null;
}

export interface RunHistoryView {
  fileName: string | null;
  selectedIndex: number | null;
  runCount: number | null;
  canGoPrevious: boolean;
  canGoNext: boolean;
  characterId: string | null;
  ascension: number | null;
  seed: string | null;
  gameMode: string | null;
  buildId: string | null;
  win: boolean | null;
  wasAbandoned: boolean | null;
  killedByEncounterId: string | null;
  killedByEventId: string | null;
  runTimeSeconds: number | null;
  startTimeUnixSeconds: number | null;
  floorReached: number | null;
  hp: string | null;
  gold: number | null;
  potionSlotCount: number | null;
  floors: RunHistoryFloorView[];
  deck: RunHistoryDeckCardView[];
  relics: RelicState[];
}

export interface GameplayView {
  screenType: string | null;
  updatedAtUtc: string | null;
  topBar: TopBarView | null;
  relics: Array<string | RelicState>;
  potions: PotionView[];
  choices?: ChoiceView[];
  notes?: string[];
  profiles?: ProfileState[];
  characters?: CharacterState[];
  characterSelection?: string | null;
  event?: {
    title: string | null;
    description: string | null;
  };
  map?: MapView | null;
  combat?: CombatViewData | null;
  cardBrowse?: CardBrowseView | null;
  runHistory?: RunHistoryView | null;
}

export interface CombatViewScreen {
  screenType: string | null;
  updatedAtUtc: string | null;
  topBar: Pick<TopBarView, 'hp' | 'gold'> | null;
  relics: Array<string | RelicState>;
  notes: string[];
  combat: CombatViewData | null;
  choices: ChoiceView[];
}

export interface ActionSummaryView {
  action: string;
  id: string;
  ackStatus: string | null;
  screenType: string | null;
  costChanges: CombatCostChange[];
  combatAfter: CombatActionStateView | null;
}

export interface CommandView {
  ok: boolean;
  actionCount: number;
  actions: ActionSummaryView[];
  state: GameplayView;
}

export interface CombatCommandView {
  ok: boolean;
  actionCount: number;
  actions: ActionSummaryView[];
  state: GameplayView | CombatViewScreen;
}
