# Mechanics

Use this note for reusable combat control patterns, runtime caveats, and safe no-thought follow-ups.

## Combat Hand Selection

This covers combat states where the game is waiting for a card choice inside the hand itself, rather than opening a standalone overlay screen.

### What It Is

This was first verified through `True Grit+`, but the pattern is likely reusable for other “choose a card from hand” effects.

### Runtime Shape

- Exported screen type: `combat_card_select`
- Backing system: `NPlayerHand`
- Key runtime mode observed: `SimpleSelect`
- Prompt source: `_selectionHeader`
- Selection source: hand cards remain visible and act as choice targets
- Confirmation source: `_selectModeConfirmButton`

### Verified Control Flow

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

### Practical Rule

This is not an overlay-screen problem.

It is a combat submode problem, so it must be handled before generic combat actions like `end_turn` or targeted attacks.

## Enemy Intents

The agent should see enemy intent in the same broad way a human player sees it:

- attack amount
- hit count
- block
- buff
- debuff
- status-card pressure
- special cases that materially change turn planning

### Sorted Baseline Intents

These are currently readable enough to treat as solved at the broad GUI level:

- `BuffIntent`
- `DefendIntent`
- `SingleAttackIntent` with a visible number
- `StunIntent`

### Not Yet Good Enough

These still need more exporter work when the GUI conveys more than the surfaced state:

- `StatusIntent`
  - surface the actual status-card payload when it matters
- `DebuffIntent`
  - surface the actual debuff identity when it matters
- mixed intents
  - summarize turns like attack-plus-debuff or buff-plus-defend in player language
- encounter-specific special moves
  - surface enough context to support the real threat model

### Working Rule

If the GUI communicates more than the surfaced state, the surfaced state is incomplete. Fix the exporter or document the gap immediately.

## Death State Export

### What We Observed

- After lethal end-turn `Infection` damage, the exporter continued to report:
  - `screenType: combat_room`
  - `currentHp: 0`
  - `currentSide: Player`
- The combat surface did not immediately transition to a distinct death or defeat screen in exported state.

### Practical Rule

- `HP <= 0` must be treated as terminal even if the screen type still says `combat_room`.
- Defeat handling needs its own surface or, at minimum, a controller guard.

## Safe No-Thought Follow-Ups

Use these only after the meaningful decision is already resolved.

### Confirmed safe

- `main_menu.continue`
- `card_pile.close`
- `event.choose:textkey:proceed`
- `rest_site.proceed`
- `combat_card_select.confirm` once exported selection progress reaches the required minimum
- `merchant.proceed` after a finished merchant visit when no further buy decision is pending

### Rule

Do not auto-advance across meaningful choices.

Gameplay commands must stay serialized. Do not send two action commands at once. The later ack can win and leave the earlier action unresolved.

Safe:

- proceed screens
- close-after-inspection
- confirm-after-selection

Not safe:

- first-time reward picks
- map branching
- merchant buys
- event options with different strategic value

## Surface Notes

- `True Grit+` is not a separate overlay screen; it enters combat hand-selection mode through `NPlayerHand`.
- Combat targeting across spawned multi-enemy boards is working. Verified target ids updated to the new creatures on the four-`Wriggler` board after `Phrog Parasite` split.

## Living Rule

This note should evolve with the combat surface. Fold new reusable control patterns and exporter caveats into the closest existing section instead of creating tiny one-off notes.
