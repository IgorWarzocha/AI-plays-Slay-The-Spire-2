import type {
  CardBrowseState,
  CombatCardState,
  CombatState,
  DisplayState,
  MapPointState,
  MenuItemState,
  PotionState,
} from './types.ts';
import type { ChoiceView, ViewMode } from './types/views.ts';
import { normalizeGameText } from './text-normalization.ts';

type CompactViewMode = Exclude<ViewMode, 'full'>;

interface ChoiceDraft {
  rawAction: string;
  action: string;
  label?: string;
  description?: string | null;
  enabled?: boolean;
  selected?: boolean;
  order: number;
}

const SKIPPED_ACTION_PREFIXES = [
  'top_bar.',
] as const;

function isSkippedAction(action: string): boolean {
  return SKIPPED_ACTION_PREFIXES.some((prefix) => action.startsWith(prefix));
}

function collapseWhitespace(value: string | null | undefined): string | null {
  return normalizeGameText(value);
}

function parsePotionChoiceAction(action: string): { mode: 'use' | 'discard'; potionId: string } | null {
  const prefixes = [
    { prefix: 'potions.use:', mode: 'use' as const },
    { prefix: 'potions.discard:', mode: 'discard' as const },
    { prefix: 'combat.use_potion:', mode: 'use' as const },
    { prefix: 'combat.discard_potion:', mode: 'discard' as const },
  ];

  for (const candidate of prefixes) {
    if (!action.startsWith(candidate.prefix)) {
      continue;
    }

    const remainder = action.slice(candidate.prefix.length);
    const [potionId = ''] = remainder.split('@', 2);
    return { mode: candidate.mode, potionId };
  }

  return null;
}

function matchPotionForAction(action: string, potions: readonly PotionState[] = []): PotionState | null {
  const parsed = parsePotionChoiceAction(action);
  if (!parsed) {
    return null;
  }

  return potions.find((potion) => potion.id === parsed.potionId) ?? null;
}

function simplifyDescription(description: string | null | undefined, label: string | undefined): string | null {
  const normalized = collapseWhitespace(description);
  if (!normalized) {
    return null;
  }

  if (/^hotkey:/i.test(normalized)) {
    return null;
  }

  const normalizedLabel = collapseWhitespace(label);
  if (normalizedLabel && normalized.toLowerCase() === normalizedLabel.toLowerCase()) {
    return null;
  }

  return normalized;
}

function titleCaseWords(value: string): string {
  return value
    .split(/[_\-.\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function matchMenuItemForAction(action: string, menuItems: readonly MenuItemState[] = []): MenuItemState | null {
  const direct = menuItems.find((item) => item.id === action);
  if (direct) {
    return direct;
  }

  const suffix = action.includes(':') ? action.slice(action.indexOf(':') + 1) : action;
  const lastSegment = action.includes('.') ? action.slice(action.lastIndexOf('.') + 1) : action;

  if (action.startsWith('event.choose:')) {
    return menuItems.find((item) => item.id === suffix || item.label?.trim().toLowerCase() === suffix.trim().toLowerCase()) ?? null;
  }

  if (action.startsWith('rewards.claim:')) {
    return menuItems.find((item) => item.id === suffix || item.id === action || item.label?.trim().toLowerCase() === suffix.trim().toLowerCase()) ?? null;
  }

  if (action.startsWith('card_reward.select:') || action.startsWith('treasure_relic.choose:')) {
    return menuItems.find((item) => item.id === suffix || item.id === action) ?? null;
  }

  if (action === 'card_reward.skip' || action.startsWith('card_reward.alternate:')) {
    return menuItems.find((item) => item.id === suffix || item.id === 'Skip' || item.label?.trim().toLowerCase() === 'skip') ?? null;
  }

  if (action.startsWith('merchant.buy:')) {
    return menuItems.find((item) => item.id === suffix || item.id === action) ?? null;
  }

  if (action === 'merchant.close') {
    return menuItems.find((item) => item.id === 'close' || item.id === action) ?? null;
  }

  if (action === 'merchant.leave') {
    return menuItems.find((item) => item.id === 'leave' || item.id === action) ?? null;
  }

  if (action === 'merchant.open') {
    return menuItems.find((item) => item.id === 'open' || item.id === action) ?? null;
  }

  if (action.startsWith('map.travel:')) {
    return menuItems.find((item) => item.id === suffix || item.id === action) ?? null;
  }

  if (action.startsWith('deck_card_select.select:') || action.startsWith('combat_card_select.select:') || action.startsWith('combat_choice_select.select:') || action.startsWith('combat_choice_select.choose:')) {
    return menuItems.find((item) => item.id === suffix || item.id === action) ?? null;
  }

  if (lastSegment === 'proceed') {
    return menuItems.find((item) => item.id === 'textkey:proceed' || item.label?.trim().toLowerCase() === 'proceed') ?? null;
  }

  return null;
}

function matchCardForAction(action: string, combat: CombatState | null | undefined, cardBrowse: CardBrowseState | null | undefined): CombatCardState | null {
  const suffix = action.includes(':') ? action.slice(action.indexOf(':') + 1) : action;
  const cards = [
    ...(combat?.hand ?? []),
    ...(cardBrowse?.cards ?? []),
  ];
  return cards.find((card) => card.id === suffix || card.id === action) ?? null;
}

function matchMapPointForAction(action: string, state: DisplayState | null | undefined): MapPointState | null {
  if (!action.startsWith('map.travel:')) {
    return null;
  }

  const coord = action.slice('map.travel:'.length);
  return (state?.map?.points ?? []).find((point) => `${point.col},${point.row}` === coord || point.id === coord) ?? null;
}

function inferRewardKind(action: string, label?: string, description?: string | null): string | null {
  const normalized = [action, label ?? '', description ?? ''].join(' ').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (action.startsWith('rewards.claim:card-')) {
    return 'card';
  }
  if (action.startsWith('rewards.claim:reward-card-')) {
    return 'card';
  }

  if (normalized.includes('skip')) {
    return 'skip';
  }
  if (normalized.includes('reward-gold') || /\b\d+\s+gold\b/.test(normalized)) {
    return 'gold';
  }
  if (normalized.includes('reward-potion') || normalized.includes(' potion')) {
    return 'potion';
  }
  if (normalized.includes('reward-relic') || normalized.includes(' relic')) {
    return 'relic';
  }
  if (normalized.includes('reward-card') || normalized.includes('add a card to your deck')) {
    return 'card';
  }

  return null;
}

function buildRewardKindCounts(actions: readonly string[], menuItems: readonly MenuItemState[] = []): Map<string, number> {
  const counts = new Map<string, number>();

  for (const action of actions) {
    if (!action.startsWith('rewards.claim:')) {
      continue;
    }

    const menuItem = matchMenuItemForAction(action, menuItems);
    const kind = inferRewardKind(action, menuItem?.label, menuItem?.description ?? null);
    if (!kind) {
      continue;
    }

    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }

  return counts;
}

function canonicalizeAction(action: string, menuItem: MenuItemState | null, rewardKindCounts: ReadonlyMap<string, number>): string {
  if (action === 'rewards.proceed' || action === 'event.choose:textkey:proceed' || action.endsWith('.proceed')) {
    return 'proceed';
  }

  if (action === 'card_reward.skip' || action.startsWith('card_reward.alternate:')) {
    return 'card_reward.skip';
  }

  if (action.startsWith('rewards.claim:')) {
    const kind = inferRewardKind(action, menuItem?.label, menuItem?.description ?? null);
    if (kind && (rewardKindCounts.get(kind) ?? 0) === 1) {
      return `rewards.claim:${kind}`;
    }
  }

  return action;
}

function fallbackLabel(action: string): string {
  if (action === 'proceed' || action.endsWith('.proceed')) {
    return 'Proceed';
  }

  const merchantLabels: Record<string, string> = {
    'merchant.open': 'Open Merchant',
    'merchant.close': 'Close Merchant',
    'merchant.leave': 'Leave Merchant',
  };
  if (merchantLabels[action]) {
    return merchantLabels[action];
  }

  const topBarLabels: Record<string, string> = {
    'top_bar.map': 'Map',
    'top_bar.deck': 'Deck',
    'top_bar.pause': 'Pause',
  };
  if (topBarLabels[action]) {
    return topBarLabels[action];
  }

  if (action.startsWith('map.travel:')) {
    return action.slice('map.travel:'.length);
  }

  if (action === 'card_reward.skip') {
    return 'Skip';
  }

  const potionAction = parsePotionChoiceAction(action);
  if (potionAction) {
    const base = potionAction.potionId
      .replace(/^potion-\d+:/i, '')
      .replace(/-/g, ' ');
    return `${potionAction.mode === 'discard' ? 'Discard' : 'Use'} ${titleCaseWords(base)}`;
  }

  const suffix = action.includes(':') ? action.slice(action.indexOf(':') + 1) : action;
  return titleCaseWords(suffix || action);
}

function enrichDraftFromState(draft: ChoiceDraft, state: DisplayState): ChoiceDraft {
  const menuItem = matchMenuItemForAction(draft.rawAction, state.menuItems ?? []);
  const card = matchCardForAction(draft.rawAction, state.combat ?? null, state.cardBrowse ?? null);
  const mapPoint = matchMapPointForAction(draft.rawAction, state);
  const potion = matchPotionForAction(draft.rawAction, state.potions ?? []);

  const label = collapseWhitespace(menuItem?.label)
    ?? collapseWhitespace(card?.title)
    ?? collapseWhitespace(potion?.title)
    ?? (mapPoint ? `${mapPoint.col},${mapPoint.row}` : null)
    ?? fallbackLabel(draft.action);

  const description = simplifyDescription(
    menuItem?.description
      ?? card?.description
      ?? potion?.description
      ?? (mapPoint?.type ? titleCaseWords(String(mapPoint.type)) : null),
    label,
  );

  return {
    ...draft,
    action: canonicalizeAction(draft.rawAction, menuItem, buildRewardKindCounts(state.actions ?? [], state.menuItems ?? [])),
    label: label ?? undefined,
    description,
    enabled: menuItem?.enabled === false ? false : undefined,
    selected: menuItem?.selected === true ? true : undefined,
  };
}

function disambiguateDuplicateLabels(drafts: ChoiceDraft[]): ChoiceDraft[] {
  const groups = new Map<string, ChoiceDraft[]>();

  for (const draft of drafts) {
    const key = (draft.label ?? '').trim().toLowerCase();
    if (!key) {
      continue;
    }

    const existing = groups.get(key) ?? [];
    existing.push(draft);
    groups.set(key, existing);
  }

  for (const group of groups.values()) {
    if (group.length <= 1) {
      continue;
    }

    group.forEach((draft, index) => {
      draft.label = `${draft.label} [${index + 1}/${group.length}]`;
    });
  }

  return drafts;
}

function dedupeEquivalentChoices(drafts: ChoiceDraft[]): ChoiceDraft[] {
  const seen = new Set<string>();
  const deduped: ChoiceDraft[] = [];

  for (const draft of drafts) {
    const key = JSON.stringify({
      action: draft.action,
      label: draft.label ?? null,
      description: draft.description ?? null,
      enabled: draft.enabled ?? null,
      selected: draft.selected ?? null,
    });

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(draft);
  }

  return deduped;
}

function shouldIncludeGameplayChoices(state: DisplayState | null | undefined, mode: CompactViewMode): boolean {
  if (!state || !Array.isArray(state.actions) || state.actions.length === 0) {
    return false;
  }

  if (state.screenType === 'combat_room') {
    return false;
  }

  if (mode === 'hard') {
    return true;
  }

  return state.screenType === 'event'
    || state.screenType === 'rewards_screen'
    || state.screenType === 'card_reward_selection'
    || state.screenType === 'treasure_relic_selection'
    || state.screenType === 'merchant_room'
    || state.screenType === 'merchant_inventory'
    || state.screenType === 'deck_card_select'
    || state.screenType === 'map'
    || state.screenType === 'map_screen'
    || state.screenType === 'pause_menu';
}

function shouldIncludeCombatChoices(state: DisplayState | null | undefined): boolean {
  return state?.screenType === 'combat_card_select' || state?.screenType === 'combat_choice_select';
}

function buildChoicesFromState(state: DisplayState, rawActions: string[]): ChoiceView[] {
  const drafts = dedupeEquivalentChoices(rawActions
    .filter((action) => !isSkippedAction(action))
    .map((rawAction, order) => ({ rawAction, action: rawAction, order }))
    .map((draft) => enrichDraftFromState(draft, state)));

  disambiguateDuplicateLabels(drafts);

  return drafts
    .sort((left, right) => left.order - right.order)
    .map((draft) => ({
      action: draft.action,
      ...(draft.label ? { label: draft.label } : {}),
      ...(draft.description ? { description: draft.description } : {}),
      ...(draft.enabled === false ? { enabled: false } : {}),
      ...(draft.selected === true ? { selected: true } : {}),
    }));
}

export function buildGameplayChoices(state: DisplayState | null | undefined, mode: CompactViewMode): ChoiceView[] {
  if (!state || !shouldIncludeGameplayChoices(state, mode)) {
    return [];
  }

  return buildChoicesFromState(state, state.actions ?? []);
}

export function buildCombatChoices(state: DisplayState | null | undefined, _mode: CompactViewMode): ChoiceView[] {
  if (!state || !shouldIncludeCombatChoices(state)) {
    return [];
  }

  const actions = (state.actions ?? [])
    .filter((action) => action.startsWith('combat_card_select.') || action.startsWith('combat_choice_select.'));
  return buildChoicesFromState(state, actions);
}
