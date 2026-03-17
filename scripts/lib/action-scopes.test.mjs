import test from "node:test";
import assert from "node:assert/strict";

import {
  assertBootstrapActions,
  assertCombatActions,
  assertGameplayActions,
  isCombatAction,
  isBootstrapAction,
} from "./action-scopes.mjs";

test("bootstrap and gameplay action scopes stay separated", () => {
  assert.equal(isBootstrapAction("main_menu.continue"), true);
  assert.equal(isBootstrapAction("combat.end_turn"), false);
  assert.equal(isCombatAction("combat.end_turn"), true);
  assert.equal(isCombatAction("event.choose:textkey:proceed"), false);

  assert.doesNotThrow(() => assertBootstrapActions(["main_menu.continue", "character.start_run"]));
  assert.doesNotThrow(() => assertGameplayActions(["event.choose:textkey:proceed", "merchant.open"]));
  assert.doesNotThrow(() => assertCombatActions(["combat.end_turn", "combat_card_select.confirm"]));

  assert.throws(() => assertBootstrapActions(["combat.end_turn"]));
  assert.throws(() => assertGameplayActions(["main_menu.continue"]));
  assert.throws(() => assertGameplayActions(["combat.end_turn"]));
  assert.throws(() => assertCombatActions(["merchant.open"]));
});
