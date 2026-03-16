# Combat Hand Selection

This note covers combat states where the game is waiting for a card choice inside the hand itself, rather than opening a standalone overlay screen.

## What It Is

This was first verified through `True Grit+`, but the pattern is likely reusable for other “choose a card from hand” effects.

## Why It Matters For Play

- These cards are stronger once the selector is understood and controllable.
- Effects that look awkward for automation stop being special cases once this pattern is handled.

## Runtime Shape

- Exported screen type: `combat_card_select`
- Backing system: `NPlayerHand`
- Key runtime mode observed: `SimpleSelect`
- Prompt source: `_selectionHeader`
- Selection source: hand cards remain visible and act as choice targets
- Confirmation source: `_selectModeConfirmButton`

## Verified Control Flow

1. play the source card from normal combat
2. wait for `screenType: "combat_card_select"`
3. read:
   - `SelectionPrompt`
   - `Selection progress`
   - selectable card ids
4. choose with:
   - `combat_card_select.select:<card-id>`
5. if minimum selection count is satisfied:
   - `combat_card_select.confirm`

## Observed Example

For `True Grit+`:

- prompt:
  - `Choose a card to Exhaust.`
- exported selection progression:
  - `0/1 selected`
  - then `1/1 selected`
- the turn does not return to normal combat until `confirm`

## Automation Implication

This is not an overlay-screen problem.

It is a combat submode problem, so it must be handled before generic combat actions like `end_turn` or targeted attacks.

## Related

- [[mechanics/README]]
- [[encounters/act1/phrog-parasite]]
- [[automation/auto-advance-opportunities]]
- [[strategy/ironclad-core-plan]]
