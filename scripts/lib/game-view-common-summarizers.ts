import type { ButtonView, CharacterState, MenuItemState, MenuItemView, ProfileState, RelicState } from './types.ts';
import { normalizeGameText } from './text-normalization.ts';

export function summarizeButton(button: { id: string; enabled?: boolean; selected?: boolean }): ButtonView {
  return {
    id: button.id,
    enabled: button.enabled,
    selected: button.selected,
  };
}

export function summarizeRelicLabel(relic: RelicState): string {
  return relic.count == null ? relic.label : `${relic.label} (${relic.count})`;
}

export function summarizeRelic(relic: RelicState): RelicState {
  return {
    id: relic.id,
    label: relic.label,
    description: normalizeGameText(relic.description),
    count: relic.count ?? null,
    status: relic.status ?? null,
  };
}

export function summarizeMenuItem(item: MenuItemState): MenuItemView {
  return {
    id: item.id,
    label: item.label,
    description: normalizeGameText(item.description),
    enabled: item.enabled,
    selected: item.selected,
  };
}

export function summarizeCharacter(character: CharacterState): CharacterState {
  return {
    id: character.id,
    label: character.label,
    isLocked: character.isLocked,
    isRandom: character.isRandom,
    isSelected: character.isSelected,
  };
}

export function summarizeProfile(profile: ProfileState): ProfileState {
  return {
    internalId: profile.internalId,
    displayId: profile.displayId,
    isCurrent: profile.isCurrent,
  };
}
