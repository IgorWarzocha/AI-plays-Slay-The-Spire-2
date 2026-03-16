# Phrog Parasite

Act 1 elite note captured from a live Ironclad run.

## What It Is

- Elite encounter
- First observed act:
  - Overgrowth
- Distinctive power:
  - `Infested`

## Key Behavior

### Parasite Phase

- Turn 1 observed as setup / infection pressure, not direct damage.
- Turn 2 observed as a `4x4` multi-attack.
- Additional setup turns can inject `Infection` cards into the player draw cycle.

### Death Transition

On death, `Infested` spawns four `Wriggler` enemies.

This is not the end of the encounter.

## Spawned Wriggler Board

Observed initial HP values:

- `21`
- `17`
- `18`
- `19`

Observed intent patterns after spawn:

- immediate spawned turn:
  - `StunIntent`
- later turn:
  - some `SingleAttackIntent "6"`
  - some `BuffIntent`
  - some `StatusIntent "1"`

## Automation Notes

- Multi-enemy targeting remained stable after the spawn.
- Verified target ids updated from the parasite to the new `Wriggler` ids.
- This encounter is a strong test case for:
  - target-id refresh
  - post-kill board mutation
  - status-card handling

## Play Notes

- `Havoc` is strong here when the top draw is known, because it can convert into a high-impact attack before the parasite’s first real damage turn.
- Killing the parasite too casually can be dangerous if the resulting `Wriggler` board is not already represented correctly in state.
- `Infection` clutter materially changes hand quality, so exhausting real cards has extra cost.
- The real danger is tempo loss after the split. A deck that only plans around the main body can get rolled by the remaining wriggler turns.

## Learned From This Run

- `True Grit+` forced the discovery of [[mechanics/combat-hand-selection]].
- The spawn board confirmed that combat export can survive enemy replacement and still expose correct target ids.
- This encounter should be treated as a “documentation mandatory” elite because it has a real phase transition, not just bigger numbers.

## Related

- [[encounters/README]]
- [[mechanics/combat-hand-selection]]
- [[strategy/ironclad-core-plan]]
