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

export interface MenuItemState {
  id: string;
  label?: string;
  description?: string | null;
  enabled?: boolean;
  selected?: boolean;
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
