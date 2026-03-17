// This module stays intentionally pure: it only reshapes exporter payloads into
// compact, human-readable summaries. Screen-level decisions belong in
// sts2-game-view.ts.

export {
  summarizeButton,
  summarizeRelicLabel,
  summarizeRelic,
  summarizeMenuItem,
  summarizeCharacter,
  summarizeProfile,
} from './game-view-common-summarizers.ts';
export {
  summarizeCombatCard,
  summarizeCostChange,
  summarizePotion,
  summarizeCreature,
  summarizeCombat,
  summarizeCombatActionState,
} from './game-view-combat-summarizers.ts';
export {
  summarizeMap,
  summarizeCardBrowse,
  summarizeRunHistory,
} from './game-view-collection-summarizers.ts';
