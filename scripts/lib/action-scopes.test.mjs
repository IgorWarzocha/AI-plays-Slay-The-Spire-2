import test from "node:test";
import assert from "node:assert/strict";

import {
  assertBootstrapActions,
  assertCombatActions,
  assertGameplayActions,
  isCombatAction,
  isBootstrapAction,
  isSharedInRunAction,
} from "./action-scopes.mjs";

test("bootstrap and gameplay action scopes stay separated", () => {
  assert.equal(isBootstrapAction("main_menu.continue"), true);
  assert.equal(isBootstrapAction("combat.end_turn"), false);
  assert.equal(isCombatAction("combat.end_turn"), true);
  assert.equal(isCombatAction("event.choose:textkey:proceed"), false);
  assert.equal(isSharedInRunAction("card_pile.close"), true);

  assert.doesNotThrow(() => assertBootstrapActions(["main_menu.continue", "character.start_run"]));
  assert.doesNotThrow(() =>
    assertGameplayActions(["event.choose:textkey:proceed", "merchant.open", "card_pile.close"]),
  );
  assert.doesNotThrow(() =>
    assertCombatActions(["combat.end_turn", "combat_card_select.confirm", "card_pile.close"]),
  );

  assert.throws(() => assertBootstrapActions(["combat.end_turn"]));
  assert.throws(() => assertGameplayActions(["main_menu.continue"]));
  assert.throws(() => assertGameplayActions(["combat.end_turn"]));
  assert.throws(() => assertCombatActions(["merchant.open"]));
});
