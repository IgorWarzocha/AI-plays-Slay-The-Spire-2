import test from "node:test";
import assert from "node:assert/strict";

import {
  assertBootstrapActions,
  assertCombatActions,
  assertGameplayActions,
  assertHistoryActions,
  isCombatScreenType,
  isCombatAction,
  isBootstrapAction,
  isHistoryAction,
  isSharedInRunAction,
  resolveCommandSurface,
} from "../lib/action-scopes.ts";

test("bootstrap and gameplay action scopes stay separated", () => {
  assert.equal(isBootstrapAction("main_menu.continue"), true);
  assert.equal(isBootstrapAction("combat.end_turn"), false);
  assert.equal(isCombatAction("combat.end_turn"), true);
  assert.equal(isCombatAction("event.choose:textkey:proceed"), false);
  assert.equal(isHistoryAction("run_history.next"), true);
  assert.equal(isHistoryAction("main_menu.compendium"), true);
  assert.equal(isHistoryAction("merchant.open"), false);
  assert.equal(isSharedInRunAction("card_pile.close"), true);

  assert.doesNotThrow(() => assertBootstrapActions(["main_menu.continue", "character.start_run"]));
  assert.doesNotThrow(() =>
    assertGameplayActions(["event.choose:textkey:proceed", "merchant.open", "card_pile.close"]),
  );
  assert.doesNotThrow(() =>
    assertHistoryActions(["main_menu.compendium", "compendium.run_history", "run_history.next"]),
  );
  assert.doesNotThrow(() => assertCombatActions(["combat.end_turn"]));
  assert.doesNotThrow(() => assertCombatActions(["combat_card_select.confirm"]));
  assert.doesNotThrow(() => assertCombatActions(["card_pile.close"]));
  assert.doesNotThrow(() =>
    assertCombatActions(["combat.play:bash-01@creature-1", "combat.end_turn"], { batch: true }),
  );

  assert.throws(() => assertBootstrapActions(["combat.end_turn"]));
  assert.throws(() => assertGameplayActions(["main_menu.continue"]));
  assert.throws(() => assertGameplayActions(["combat.end_turn"]));
  assert.throws(() => assertHistoryActions(["combat.end_turn"]));
  assert.throws(() => assertCombatActions(["merchant.open"]));
  assert.throws(
    () => assertCombatActions(["combat.play:bash-01@creature-1", "combat.end_turn"]),
    /requires --batch/,
  );
});

test("resolveCommandSurface auto-routes play commands", () => {
  assert.equal(resolveCommandSurface(["main_menu.continue"]), "bootstrap");
  assert.equal(resolveCommandSurface(["merchant.open"]), "gameplay");
  assert.equal(resolveCommandSurface(["combat.end_turn"]), "combat");
  assert.equal(resolveCommandSurface(["card_pile.close"], "combat_room"), "combat");
  assert.equal(resolveCommandSurface(["card_pile.close"], "merchant_inventory"), "gameplay");
  assert.equal(isCombatScreenType("combat_room"), true);
  assert.equal(isCombatScreenType("merchant_inventory"), false);

  assert.throws(() => resolveCommandSurface(["main_menu.continue", "merchant.open"]), /Cannot mix bootstrap/);
  assert.throws(() => resolveCommandSurface(["combat.end_turn", "merchant.open"]), /Cannot mix combat/);
  assert.throws(() => resolveCommandSurface(["run_history.next"]), /sts2history/);
});
