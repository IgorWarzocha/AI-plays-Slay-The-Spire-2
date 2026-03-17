export type OptionValue = string | boolean | number;
export type OptionMap = Record<string, OptionValue>;

export interface ParsedArgs {
  positional: string[];
  options: OptionMap;
}

export interface RuntimeCommandOptions extends Record<string, string | boolean | number | undefined> {
  id?: string;
  raw?: boolean | string;
  notes?: boolean | string;
  menu?: boolean | string;
  relics?: boolean | string;
  actions?: boolean | string;
  strict?: boolean | string;
  character?: string;
  seed?: string;
  act1?: string;
  waitTimeoutMs?: number | string;
  settleTimeoutMs?: number | string;
  followThroughTimeoutMs?: number | string;
  ["settle-timeout-ms"]?: number | string;
  ["follow-through-timeout-ms"]?: number | string;
}

export interface TopBarButtonState {
  id: string;
  enabled?: boolean;
  selected?: boolean;
}

export interface TopBarState {
  currentHp?: number;
  maxHp?: number;
  gold?: number;
  potionSlotCount?: number;
  filledPotionSlotCount?: number;
  emptyPotionSlotCount?: number;
  buttons?: TopBarButtonState[];
  [key: string]: unknown;
}

export interface RelicState {
  id: string;
  label: string;
  description?: string | null;
  count?: number | null;
  status?: string | null;
}

export interface PotionState {
  id: string;
  slotIndex?: number | null;
  hasPotion?: boolean;
  title: string;
  description?: string | null;
  usage?: string | null;
  isUsable?: boolean;
  canDiscard?: boolean;
  validTargetIds?: string[];
}

export interface CardOverlayState {
  kind: string;
  typeName?: string | null;
  title?: string | null;
  description?: string | null;
  extraCardText?: string | null;
  amount?: number | null;
  status?: string | null;
  overlayPath?: string | null;
  glowsGold?: boolean | null;
  glowsRed?: boolean | null;
}

export interface UnplayableState {
  reason?: string | null;
  preventerType?: string | null;
  preventerTitle?: string | null;
  preventerDescription?: string | null;
}

export interface CombatCardState {
  id: string;
  title?: string;
  costText?: string | null;
  description?: string | null;
  isPlayable?: boolean;
  validTargetIds?: string[];
  upgraded?: boolean;
  affliction?: CardOverlayState | null;
  enchantment?: CardOverlayState | null;
  unplayable?: UnplayableState | null;
  glowsGold?: boolean;
  glowsRed?: boolean;
}

export interface CreatureIntentState {
  kind: string;
  label?: string | null;
  title?: string | null;
  description?: string | null;
  summary?: string | null;
  targets?: string[];
}

export interface CreaturePowerState {
  title?: string;
  amount?: number | null;
  [key: string]: unknown;
}

export interface CreatureState {
  id: string;
  name: string;
  side: string;
  currentHp?: number;
  maxHp?: number;
  block?: number;
  powers?: CreaturePowerState[];
  intents?: CreatureIntentState[];
}

export interface CombatState {
  roundNumber?: number | null;
  currentSide?: string | null;
  energy?: number | null;
  handIsSettled?: boolean | null;
  activeHandCount?: number | null;
  totalHandCount?: number | null;
  pendingHandHolderCount?: number | null;
  handAnimationActive?: boolean | null;
  cardPlayInProgress?: boolean | null;
  drawPileCount?: number | null;
  discardPileCount?: number | null;
  exhaustPileCount?: number | null;
  canEndTurn?: boolean;
  selectionMode?: string | null;
  selectionPrompt?: string | null;
  hand?: CombatCardState[];
  potions?: PotionState[];
  creatures?: CreatureState[];
}

export interface MapPointState {
  id: string;
  col: number;
  row: number;
  type?: string | null;
  state?: string | null;
  travelable?: boolean;
}

export interface MapState {
  visible?: boolean;
  travelEnabled?: boolean;
  traveling?: boolean;
  points?: MapPointState[];
}

export interface CardBrowseState {
  kind: string;
  title: string;
  pileType?: string | null;
  cardCount: number;
  canClose: boolean;
  cards?: CombatCardState[];
}

export interface RunHistoryChoice {
  label: string;
  picked: boolean;
}

export interface RunHistoryFloorRoom {
  roomType?: string | null;
  modelId?: string | null;
  turnsTaken?: number | null;
  monsterIds?: string[];
}

export interface RunHistoryCardRecord {
  id?: string;
  title: string;
  costText?: string | null;
  upgraded?: boolean;
  count?: number;
  floorsAdded?: number[];
  description?: string | null;
}

export interface RunHistoryTransformRecord {
  originalCard?: RunHistoryCardRecord | null;
  finalCard?: RunHistoryCardRecord | null;
}

export interface RunHistoryFloor {
  floor: number;
  mapPointType?: string | null;
  currentHp?: number | null;
  maxHp?: number | null;
  currentGold?: number | null;
  damageTaken?: number | null;
  hpHealed?: number | null;
  goldGained?: number | null;
  goldSpent?: number | null;
  rooms?: RunHistoryFloorRoom[];
  cardsGained?: RunHistoryCardRecord[];
  cardsRemoved?: RunHistoryCardRecord[];
  cardsTransformed?: RunHistoryTransformRecord[];
  upgradedCards?: string[];
  downgradedCards?: string[];
  boughtRelics?: string[];
  boughtPotions?: string[];
  potionUsed?: string[];
  potionDiscarded?: string[];
  restSiteChoices?: string[];
  cardChoices?: RunHistoryChoice[];
  relicChoices?: RunHistoryChoice[];
  potionChoices?: RunHistoryChoice[];
  ancientChoices?: RunHistoryChoice[];
  eventChoices?: string[];
}

export interface RunHistoryState {
  fileName?: string | null;
  selectedIndex?: number | null;
  runCount?: number | null;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  characterId?: string | null;
  ascension?: number | null;
  seed?: string | null;
  gameMode?: string | null;
  buildId?: string | null;
  win?: boolean | null;
  wasAbandoned?: boolean | null;
  killedByEncounterId?: string | null;
  killedByEventId?: string | null;
  runTimeSeconds?: number | null;
  startTimeUnixSeconds?: number | null;
  floorReached?: number | null;
  currentHp?: number | null;
  maxHp?: number | null;
  currentGold?: number | null;
  potionSlotCount?: number | null;
  floors?: RunHistoryFloor[];
  deck?: RunHistoryCardRecord[];
  relics?: RelicState[];
}

export interface ProfileState {
  internalId: string;
  displayId: string;
  isCurrent: boolean;
}

export interface CharacterState {
  id: string;
  label: string;
  isLocked: boolean;
  isRandom: boolean;
  isSelected: boolean;
}

export interface DisplayState {
  screenType?: string | null;
  updatedAtUtc?: string | null;
  lastHandledCommandId?: string | null;
  topBar?: TopBarState | null;
  relics?: RelicState[];
  potions?: PotionState[];
  actions?: string[];
  notes?: string[];
  menuItems?: MenuItemState[];
  combat?: CombatState | null;
  map?: MapState | null;
  cardBrowse?: CardBrowseState | null;
  runHistory?: RunHistoryState | null;
  profiles?: ProfileState[];
  characters?: CharacterState[];
  characterSelection?: string | null;
  eventTitle?: string | null;
  eventDescription?: string | null;
  [key: string]: unknown;
}

export interface MenuItemState {
  id: string;
  label?: string;
  description?: string | null;
  enabled?: boolean;
  selected?: boolean;
}

export interface CommandPayload {
  id: string;
  action: string;
  character?: string;
  seed?: string;
  act1?: string;
}

export interface CommandAck {
  id: string;
  status: string;
  handledAtUtc?: string | null;
  message?: string | null;
}

export interface ActionResult {
  action: string;
  resolvedAction?: string;
  id: string;
  ack?: CommandAck;
  settled?: boolean;
  ackStatus?: string;
  screenType?: string | null;
  costChanges?: CombatCostChange[];
  state?: DisplayState | null;
}

export interface RunActionsResult {
  ok: boolean;
  actionCount: number;
  results: ActionResult[];
  state: DisplayState | null;
}

export interface CombatCostChange {
  cardId: string;
  title: string | null;
  beforeCost: string | null;
  afterCost: string | null;
}

export interface GameWindow {
  address?: string;
  class?: string;
  title?: string;
  [key: string]: unknown;
}

export interface LiveStatus {
  capturedAtUtc: string;
  running: boolean;
  window: GameWindow | null;
  state: DisplayState | null;
  ack: CommandAck | null;
}

export interface AdminStatus {
  running: boolean;
  monitor: {
    running: boolean;
    pid: number | null;
  };
  window: GameWindow | null;
  state: {
    screenType: string | null;
    updatedAtUtc: string | null;
    lastHandledCommandId: string | null;
  } | null;
  ack: CommandAck | null;
}

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
  combat: {
    roundNumber: number | null;
    currentSide: string | null;
    energy: number | null;
    canEndTurn: boolean | null;
    selectionMode: string | null;
    selectionPrompt: string | null;
    hand: CombatCardView[];
  } | null;
}

export interface MapPointView {
  id: string;
  coord: string;
  type: string | null | undefined;
  state: string | null | undefined;
  travelable: boolean | undefined;
}

export interface MapView {
  visible: boolean | undefined;
  travelEnabled: boolean | undefined;
  traveling: boolean | undefined;
  points: MapPointView[];
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
  actions?: string[];
  notes?: string[];
  profiles?: ProfileState[];
  characters?: CharacterState[];
  characterSelection?: string | null;
  event?: {
    title: string | null;
    description: string | null;
    options: MenuItemView[];
  };
  map?: MapView | null;
  combat?: CombatViewData | null;
  cardBrowse?: CardBrowseView | null;
  runHistory?: RunHistoryView | null;
  menuItems?: MenuItemView[];
}

export interface CombatViewScreen {
  screenType: string | null;
  updatedAtUtc: string | null;
  topBar: Pick<TopBarView, 'hp' | 'gold'> | null;
  relics: Array<string | RelicState>;
  notes: string[];
  combat: CombatViewData | null;
  menuItems: MenuItemView[];
  actions: string[];
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
