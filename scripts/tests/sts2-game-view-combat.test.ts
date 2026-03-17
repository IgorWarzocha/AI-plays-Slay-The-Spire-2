import test from "node:test";
import assert from "node:assert/strict";

import { buildCombatCommandView, buildCombatView, buildGameplayView } from "../lib/sts2-game-view.ts";

function expectDefined<T>(value: T): NonNullable<T> {
  assert.notEqual(value, null);
  assert.notEqual(value, undefined);
  return value as NonNullable<T>;
}

test("buildCombatCommandView falls back to gameplay view when combat actions exit combat", () => {
  const result = {
    ok: true,
    actionCount: 1,
    results: [
      { action: "combat.play:feed", id: "cmd-1", ackStatus: "completed", screenType: "rewards_screen" },
    ],
    state: {
      screenType: "rewards_screen",
      updatedAtUtc: "2026-03-17T12:05:00.000Z",
      actions: ["rewards.proceed"],
      relics: [{ id: "BurningBlood", label: "Burning Blood", description: "Heal.", count: null, status: "Active" }],
      menuItems: [{ id: "reward-1", label: "100 Gold", description: "100 Gold", enabled: true, selected: false }],
      topBar: { currentHp: 54, maxHp: 89, gold: 256, buttons: [] },
    },
  };

  const view = buildCombatCommandView(result);
  assert.equal(view.state.screenType, "rewards_screen");
  assert.deepEqual(view.state.actions, ["rewards.proceed"]);
});

test("buildCombatView supports modal combat card choice overlays", () => {
  const state = {
    screenType: "combat_card_select",
    updatedAtUtc: "2026-03-17T12:35:00.000Z",
    topBar: { currentHp: 37, maxHp: 92, gold: 120 },
    relics: [{ id: "BurningBlood", label: "Burning Blood", description: "Heal 6 HP.", count: null, status: "Active" }],
    notes: ["Choose a card to exhaust."],
    menuItems: [{ id: "cancel", label: "Cancel", description: null, enabled: true, selected: false }],
    actions: ["combat_card_select.select:strike-01", "combat_card_select.confirm", "top_bar.pause"],
    combat: {
      roundNumber: 5,
      currentSide: "Player",
      energy: 1,
      handIsSettled: true,
      canEndTurn: false,
      selectionMode: "SimpleSelect",
      selectionPrompt: "Choose a card to Exhaust.",
      hand: [{ id: "strike-01", title: "Strike", costText: "1", isPlayable: true, validTargetIds: [] }],
      potions: [],
      creatures: [],
    },
  };

  const view = buildCombatView(state, { notes: true });
  assert.equal(view.notes[0], "Choose a card to exhaust.");
  assert.equal(expectDefined(view.combat).selectionPrompt, "Choose a card to Exhaust.");
  assert.deepEqual(view.actions, ["combat_card_select.select:strike-01", "combat_card_select.confirm"]);
});

test("buildCombatCommandView surfaces combat cost changes per action", () => {
  const result = {
    ok: true,
    actionCount: 1,
    results: [
      {
        action: "combat.play:mummified-power",
        id: "cmd-2",
        ackStatus: "completed",
        screenType: "combat_room",
        costChanges: [{ cardId: "bash-01", title: "Bash", beforeCost: "2", afterCost: "1" }],
        state: {
          screenType: "combat_room",
          updatedAtUtc: "2026-03-17T12:40:00.000Z",
          combat: {
            roundNumber: 2,
            currentSide: "Player",
            energy: 2,
            canEndTurn: true,
            selectionMode: null,
            selectionPrompt: null,
            hand: [{ id: "bash-01", title: "Bash", costText: "1", isPlayable: true, validTargetIds: ["creature-1"] }],
          },
        },
      },
    ],
    state: {
      screenType: "combat_room",
      updatedAtUtc: "2026-03-17T12:40:00.000Z",
      topBar: { currentHp: 52, maxHp: 80, gold: 88 },
      relics: [],
      notes: [],
      menuItems: [],
      actions: ["combat.play:bash-01@creature-1"],
      combat: {
        roundNumber: 2,
        currentSide: "Player",
        energy: 2,
        handIsSettled: true,
        canEndTurn: true,
        hand: [{ id: "bash-01", title: "Bash", costText: "1", isPlayable: true, validTargetIds: ["creature-1"] }],
        potions: [],
        creatures: [],
      },
    },
  };

  const view = buildCombatCommandView(result);
  assert.equal(expectDefined(expectDefined(view.actions[0]).costChanges[0]).afterCost, "1");
  assert.equal(expectDefined(expectDefined(expectDefined(view.actions[0]).combatAfter).combat).hand[0]?.cost, "1");
});

test("buildGameplayView surfaces combat card transient states and unplayable causes", () => {
  const state = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T12:50:00.000Z",
    topBar: { currentHp: 29, maxHp: 80, gold: 45, buttons: [] },
    relics: [],
    potions: [],
    actions: [],
    combat: {
      roundNumber: 6,
      currentSide: "Player",
      energy: 1,
      handIsSettled: true,
      canEndTurn: true,
      hand: [
        {
          id: "bound-card-01",
          title: "Uppercut",
          costText: "2",
          description: "Deal damage and apply Weak/Vulnerable.",
          isPlayable: false,
          validTargetIds: ["creature-1"],
          affliction: {
            kind: "Affliction",
            typeName: "Bound",
            title: "Bound",
            description: "Only 1 Bound card can be played each turn.",
            amount: 1,
            status: "Active",
            overlayPath: null,
            glowsGold: false,
            glowsRed: true,
          },
          enchantment: {
            kind: "Enchantment",
            typeName: "Empowered",
            title: "Empowered",
            description: "Costs 1 less this turn.",
            amount: 1,
            status: "Active",
            overlayPath: null,
            glowsGold: true,
            glowsRed: false,
          },
          unplayable: {
            reason: "Already played a Bound card this turn.",
            preventerType: "BoundBlocker",
            preventerTitle: "Bound",
            preventerDescription: "Only 1 Bound card can be played each turn.",
          },
          glowsGold: true,
          glowsRed: true,
        },
      ],
      potions: [],
      creatures: [],
    },
  };

  const view = buildGameplayView(state);
  const card = expectDefined(expectDefined(view.combat).hand[0]);
  assert.equal(expectDefined(card.affliction).title, "Bound");
  assert.equal(expectDefined(card.enchantment).title, "Empowered");
  assert.equal(expectDefined(card.unplayable).reason, "Already played a Bound card this turn.");
  assert.equal(card.glowsGold, true);
  assert.equal(card.glowsRed, true);
});
