import test from "node:test";
import assert from "node:assert/strict";

import { buildCombatCommandView, buildCombatView, buildDeckInspectView, buildGameplayView } from "../lib/sts2-game-view.ts";

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

  const view = buildCombatCommandView(result, { hard: true });
  assert.equal(view.state.screenType, "rewards_screen");
  assert.deepEqual(expectDefined(view.state.choices).map((choice) => choice.action), ["proceed"]);
});

test("buildCombatCommandView keeps next actions and reward choices in easy mode after exiting combat", () => {
  const result = {
    ok: true,
    actionCount: 2,
    results: [
      { action: "combat.play:strike", id: "cmd-1", ackStatus: "completed", screenType: "combat_room" },
      { action: "combat.play:strike", id: "cmd-2", ackStatus: "completed", screenType: "rewards_screen" },
    ],
    state: {
      screenType: "rewards_screen",
      updatedAtUtc: "2026-03-17T12:06:00.000Z",
      actions: ["rewards.claim:gold", "rewards.claim:card", "rewards.proceed"],
      notes: ["Rewards visible: 2."],
      relics: [],
      potions: [],
      menuItems: [
        { id: "rewards.claim:gold", label: "13 Gold", description: "13 Gold", enabled: true, selected: false },
        { id: "rewards.claim:card", label: "Add a card to your deck.", description: "Add a card to your deck.", enabled: true, selected: false },
      ],
      topBar: { currentHp: 54, maxHp: 89, gold: 256, buttons: [] },
    },
  };

  const view = buildCombatCommandView(result, { easy: true });
  assert.deepEqual(expectDefined(view.state.choices).map((choice) => choice.action), ["rewards.claim:gold", "rewards.claim:card", "proceed"]);
  assert.equal(expectDefined(view.state.notes)[0], "Rewards visible: 2.");
  assert.equal(expectDefined(expectDefined(view.state.choices)[0]).label, "13 Gold");
});

test("buildCombatCommandView keeps easy command output compact on merchant inventory", () => {
  const result = {
    ok: true,
    actionCount: 1,
    results: [
      { action: "map.travel:5,2", id: "cmd-1", ackStatus: "completed", screenType: "merchant_inventory" },
    ],
    state: {
      screenType: "merchant_inventory",
      updatedAtUtc: "2026-03-17T12:07:00.000Z",
      actions: ["merchant.buy:card-01", "merchant.close"],
      notes: ["Merchant inventory is active."],
      relics: [],
      potions: [],
      menuItems: [
        { id: "card-01", label: "Burning Pact", description: "Cost: 77 gold.", enabled: true, selected: false },
        { id: "close", label: "Close Merchant", description: "Close the merchant inventory.", enabled: true, selected: false },
      ],
      topBar: { currentHp: 54, maxHp: 89, gold: 256, buttons: [] },
    },
  };

  const view = buildCombatCommandView(result, { easy: true });
  assert.deepEqual(expectDefined(view.state.choices).map((choice) => choice.action), ["merchant.buy:card-01", "merchant.close"]);
  assert.equal(view.state.notes, undefined);
  assert.equal(expectDefined(expectDefined(view.state.choices)[0]).label, "Burning Pact");
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

  const view = buildCombatView(state, { hard: true });
  assert.equal(view.notes[0], "Choose a card to exhaust.");
  assert.equal(expectDefined(view.combat).selectionPrompt, "Choose a card to Exhaust.");
  assert.deepEqual(view.choices.map((choice) => choice.action), ["combat_card_select.select:strike-01", "combat_card_select.confirm"]);
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
            handIsSettled: true,
            activeHandCount: 1,
            totalHandCount: 1,
            pendingHandHolderCount: 0,
            handAnimationActive: false,
            cardPlayInProgress: false,
            drawPileCount: 9,
            discardPileCount: 2,
            exhaustPileCount: 0,
            canEndTurn: true,
            selectionMode: null,
            selectionPrompt: null,
            potions: [],
            creatures: [],
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
        activeHandCount: 1,
        totalHandCount: 1,
        pendingHandHolderCount: 0,
        handAnimationActive: false,
        cardPlayInProgress: false,
        drawPileCount: 9,
        discardPileCount: 2,
        exhaustPileCount: 0,
        canEndTurn: true,
        hand: [{ id: "bash-01", title: "Bash", costText: "1", isPlayable: true, validTargetIds: ["creature-1"] }],
        potions: [],
        creatures: [],
      },
    },
  };

  const view = buildCombatCommandView(result);
  assert.equal(expectDefined(expectDefined(view.actions[0]).costChanges[0]).afterCost, "1");
  const combatAfter = expectDefined(expectDefined(view.actions[0]).combatAfter).combat;
  assert.equal(expectDefined(combatAfter).hand[0]?.cost, "1");
  assert.equal(expectDefined(combatAfter).piles.draw, 9);
});

test("buildCombatCommandView keeps rich combatAfter details even in easy mode", () => {
  const result = {
    ok: true,
    actionCount: 1,
    results: [
      {
        action: "combat.play:bash-01@creature-1",
        id: "cmd-3",
        ackStatus: "completed",
        screenType: "combat_room",
        state: {
          screenType: "combat_room",
          updatedAtUtc: "2026-03-17T12:41:00.000Z",
          combat: {
            roundNumber: 2,
            currentSide: "Player",
            energy: 1,
            handIsSettled: true,
            activeHandCount: 3,
            totalHandCount: 3,
            pendingHandHolderCount: 0,
            handAnimationActive: false,
            cardPlayInProgress: false,
            drawPileCount: 7,
            discardPileCount: 2,
            exhaustPileCount: 0,
            canEndTurn: true,
            hand: [
              {
                id: "strike-01",
                title: "Strike",
                costText: "1",
                description: "Deal 6 damage.",
                isPlayable: true,
                validTargetIds: ["creature-1"],
              },
            ],
            potions: [],
            creatures: [
              {
                id: "creature-1",
                name: "Fossil Stalker",
                side: "Enemy",
                currentHp: 39,
                maxHp: 51,
                block: 0,
                intents: [
                  {
                    kind: "SingleAttackIntent",
                    label: "12",
                    title: "Aggressive",
                    description: "Attack for 12.",
                    summary: "12 damage",
                    targets: ["creature-0"],
                  },
                ],
                powers: [],
              },
            ],
          },
        },
      },
    ],
    state: {
      screenType: "combat_room",
      updatedAtUtc: "2026-03-17T12:41:00.000Z",
      topBar: { currentHp: 52, maxHp: 80, gold: 88 },
      relics: [],
      notes: [],
      menuItems: [],
      actions: ["combat.end_turn"],
      combat: {
        roundNumber: 2,
        currentSide: "Player",
        energy: 1,
        handIsSettled: true,
        activeHandCount: 3,
        totalHandCount: 3,
        pendingHandHolderCount: 0,
        handAnimationActive: false,
        cardPlayInProgress: false,
        drawPileCount: 7,
        discardPileCount: 2,
        exhaustPileCount: 0,
        canEndTurn: true,
        hand: [],
        potions: [],
        creatures: [],
      },
    },
  };

  const view = buildCombatCommandView(result, { easy: true });
  const combatAfter = expectDefined(expectDefined(view.actions[0]).combatAfter).combat;
  assert.equal(expectDefined(combatAfter).hand[0]?.description, "Deal 6 damage.");
  assert.equal(expectDefined(expectDefined(combatAfter).creatures[0]).intents[0]?.summary, "12 damage");
  assert.equal(expectDefined(combatAfter).piles.draw, 7);
  assert.equal(expectDefined(combatAfter).handMeta?.active, 3);
});

test("buildDeckInspectView returns restored combat state plus captured deck view", () => {
  const result = {
    ok: true,
    actionCount: 2,
    results: [
      { action: "top_bar.deck", id: "cmd-open", ackStatus: "completed", screenType: "deck_view" },
      {
        action: "top_bar.deck",
        id: "cmd-close",
        ackStatus: "completed",
        screenType: "combat_room",
        state: {
          screenType: "combat_room",
          updatedAtUtc: "2026-03-17T12:45:00.000Z",
          topBar: { currentHp: 87, maxHp: 90, gold: 282 },
          relics: [],
          notes: [],
          actions: ["combat.end_turn"],
          combat: {
            roundNumber: 1,
            currentSide: "Player",
            energy: 6,
            handIsSettled: true,
            activeHandCount: 5,
            totalHandCount: 5,
            pendingHandHolderCount: 0,
            handAnimationActive: false,
            cardPlayInProgress: false,
            canEndTurn: true,
            hand: [{ id: "strike-01", title: "Strike", costText: "1", isPlayable: true, validTargetIds: ["enemy-1"] }],
            potions: [],
            creatures: [{ id: "enemy-1", name: "Spiny Toad", side: "Enemy", currentHp: 119, maxHp: 119, block: 0, intents: [] }],
          },
        },
      },
    ],
    state: {
      screenType: "combat_room",
      updatedAtUtc: "2026-03-17T12:45:00.000Z",
      topBar: { currentHp: 87, maxHp: 90, gold: 282 },
      relics: [],
      notes: [],
      actions: ["combat.end_turn"],
      combat: {
        roundNumber: 1,
        currentSide: "Player",
        energy: 6,
        handIsSettled: true,
        activeHandCount: 5,
        totalHandCount: 5,
        pendingHandHolderCount: 0,
        handAnimationActive: false,
        cardPlayInProgress: false,
        canEndTurn: true,
        hand: [{ id: "strike-01", title: "Strike", costText: "1", isPlayable: true, validTargetIds: ["enemy-1"] }],
        potions: [],
        creatures: [{ id: "enemy-1", name: "Spiny Toad", side: "Enemy", currentHp: 119, maxHp: 119, block: 0, intents: [] }],
      },
    },
    deckState: {
      screenType: "deck_view",
      updatedAtUtc: "2026-03-17T12:44:00.000Z",
      topBar: { currentHp: 87, maxHp: 90, gold: 282, potionSlotCount: 3, filledPotionSlotCount: 2, emptyPotionSlotCount: 1 },
      relics: [{ id: "BurningBlood", label: "Burning Blood", description: "Heal 6 HP.", count: null, status: "Active" }],
      potions: [{ id: "potion-01", slotIndex: 1, hasPotion: true, title: "Strength Potion", description: "Gain 2 Strength.", usage: "CombatOnly", isUsable: false, canDiscard: true }],
      actions: ["top_bar.deck"],
      menuItems: [{ id: "obtained", label: "Obtained", description: "Sort deck by obtained.", enabled: true, selected: false }],
      cardBrowse: {
        kind: "deck_view",
        title: "Deck",
        pileType: "Deck",
        cardCount: 1,
        canClose: true,
        cards: [{ id: "c1", title: "Strike", costText: "1", upgraded: false, description: "Deal 6 damage." }],
      },
    },
    sourceScreenType: "combat_room",
    restoredScreenType: "combat_room",
  };

  const view = buildDeckInspectView(result, { easy: true });
  assert.equal(view.state.screenType, "combat_room");
  assert.equal(view.restoredScreenType, "combat_room");
  assert.equal(view.sourceScreenType, "combat_room");
  assert.equal(expectDefined(view.deckView.cardBrowse).cardCount, 1);
  assert.equal(view.deckView.relics, undefined);
  assert.equal(view.deckView.potions, undefined);
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

  const view = buildGameplayView(state, { hard: true });
  const card = expectDefined(expectDefined(view.combat).hand[0]);
  assert.equal(expectDefined(card.affliction).title, "Bound");
  assert.equal(expectDefined(card.enchantment).title, "Empowered");
  assert.equal(expectDefined(card.unplayable).reason, "Already played a Bound card this turn.");
  assert.equal(card.glowsGold, true);
  assert.equal(card.glowsRed, true);
});

test("buildCombatView easy mode trims combat noise for routine turns", () => {
  const state = {
    screenType: "combat_room",
    updatedAtUtc: "2026-03-17T12:50:00.000Z",
    topBar: { currentHp: 29, maxHp: 80, gold: 45, buttons: [] },
    relics: [],
    notes: ["Combat state is model-backed."],
    menuItems: [{ id: "cancel", label: "Cancel", description: null, enabled: true, selected: false }],
    actions: ["combat.end_turn"],
    combat: {
      roundNumber: 6,
      currentSide: "Player",
      energy: 1,
      handIsSettled: true,
      activeHandCount: 4,
      totalHandCount: 4,
      pendingHandHolderCount: 0,
      handAnimationActive: false,
      cardPlayInProgress: false,
      drawPileCount: 9,
      discardPileCount: 4,
      exhaustPileCount: 0,
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
        },
      ],
      potions: [
        { id: "potion-01:blood-potion", slotIndex: 1, hasPotion: true, title: "Blood Potion", description: "Heal 20%.", usage: "AnyTime", isUsable: true, canDiscard: true },
        { id: "potion-02:empty", slotIndex: 2, hasPotion: false, title: "Empty Slot", description: null, usage: null, isUsable: false, canDiscard: false },
      ],
      creatures: [
        {
          id: "enemy-1",
          name: "Soul Fysh",
          side: "Enemy",
          currentHp: 122,
          maxHp: 122,
          block: 0,
          intents: [
            {
              kind: "SingleAttackIntent",
              label: "18",
              title: "Heavy Slam",
              description: "Deal 18 damage.",
              summary: "18 damage",
              targets: ["player"],
            },
          ],
          powers: [{ title: "Intangible", amount: 1, description: "Ignore most damage." }],
        },
      ],
    },
  };

  const view = buildCombatView(state, { easy: true });
  assert.deepEqual(view.notes, []);
  assert.deepEqual(view.choices, []);
  assert.equal(expectDefined(view.combat).piles.draw, null);
  assert.equal(expectDefined(expectDefined(view.combat).hand[0]).description, null);
  assert.equal(expectDefined(expectDefined(expectDefined(view.combat).creatures[0]).intents[0]).description, null);
  assert.equal(expectDefined(view.combat).potions.length, 1);
});
