# Enemy Intents

This note tracks how close the surfaced combat intent is to what a player would understand from the GUI.

## Goal

The agent should see enemy intent in the same broad way a human player sees it:

- attack amount
- hit count
- block
- buff
- debuff
- status-card pressure
- special cases that materially change turn planning

## Sorted Baseline Intents

These generic intents are currently readable enough to treat as solved at the broad GUI level.

### Buff

- Surfaced shape:
  - `BuffIntent`
- GUI meaning:
  - enemy intends to use a buff
- Example:
  - `Tunneler`
  - tooltip text: `Empower`

### Defend

- Surfaced shape:
  - `DefendIntent`
- GUI meaning:
  - enemy intends to gain block
- Example:
  - `Tunneler`
  - tooltip text: `Defensive`

### Single Attack

- Surfaced shape:
  - `SingleAttackIntent`
  - numeric label usually present
- GUI meaning:
  - enemy intends to attack once for the shown amount

### Stun

- Surfaced shape:
  - `StunIntent`
- GUI meaning:
  - enemy is not acting normally this turn
- Example:
  - `Phrog Parasite` spawned `Wriggler` turn

## Not Yet Good Enough

These are still too generic in surfaced state and need more work.

- `StatusIntent`
  - We need the actual status-card payload when the GUI makes it meaningfully clear.
- `DebuffIntent`
  - We need the actual debuff identity when the GUI implies more than a generic debuff.
- mixed intents
  - We need clean player-language summaries when a turn is really "attack plus debuff" or "buff plus defend".
- encounter-specific special moves
  - We need the surfaced state to reflect when a move should be mentally read through an STS1 analogue.

## Working Rule

If the GUI communicates more than the surfaced state, the surfaced state is incomplete.

That should trigger one of two actions:

- improve the exporter
- add a vault note documenting the gap and the observed meaning

## Related

- [[mechanics/README]]
- [[encounters/act1/phrog-parasite]]
- [[encounters/act1/soul-fysh]]
