# Auto-Advance Opportunities

Use this note for deterministic “no-thought” follow-ups that are safe to automate once the meaningful choice is already resolved.

## Confirmed Safe

- `main_menu.continue`
  - Safe when an active run exists.
- `card_pile.close`
  - Safe immediately after an intentional pile inspection.
- `event.choose:textkey:proceed`
  - Safe after an event choice has already resolved and the screen is only waiting for the run to continue.
- `rest_site.proceed`
  - Safe after the chosen rest-site action resolves.
- `combat_card_select.confirm`
  - Safe once exported selection progress reaches the required minimum.
- `merchant.proceed`
  - Safe after a finished merchant visit when the room is already resolved and no further buy decision is pending.

## Rule

Do not auto-advance across meaningful choices.

Safe:

- proceed screens
- close-after-inspection
- confirm-after-selection

Not safe:

- first-time reward picks
- map branching
- merchant buys
- event options with different strategic value

## Related

- [[automation/README]]
- [[mechanics/combat-hand-selection]]
