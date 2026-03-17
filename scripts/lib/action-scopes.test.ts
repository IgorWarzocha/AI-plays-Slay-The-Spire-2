import test from "node:test";
import assert from "node:assert/strict";

import {
  assertBootstrapActions,
  assertCombatActions,
  assertGameplayActions,
  assertHistoryActions,
  isCombatAction,
  isBootstrapAction,
  isHistoryAction,
  isSharedInRunAction,
} from "./action-scopes.ts";

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
  assert.doesNotThrow(() =>
    assertCombatActions(["combat.end_turn", "combat_card_select.confirm", "card_pile.close"]),
  );

  assert.throws(() => assertBootstrapActions(["combat.end_turn"]));
  assert.throws(() => assertGameplayActions(["main_menu.continue"]));
  assert.throws(() => assertGameplayActions(["combat.end_turn"]));
  assert.throws(() => assertHistoryActions(["combat.end_turn"]));
  assert.throws(() => assertCombatActions(["merchant.open"]));
});
