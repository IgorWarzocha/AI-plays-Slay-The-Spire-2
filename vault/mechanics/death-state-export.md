# Death State Export

## What It Is

- Type: exporter/runtime edge case
- First observed: live Ironclad death inside [phrog-parasite](/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/references/act1/elites/phrog-parasite.md)

## What We Observed

- After lethal end-turn `Infection` damage, the exporter continued to report:
  - `screenType: combat_room`
  - `currentHp: 0`
  - `currentSide: Player`
- The combat surface did not immediately transition to a distinct death or defeat screen in exported state.

## Why It Matters For Play

- A human can see the run is over. The agent should not keep reasoning as if combat is still active.

## Why It Matters For Automation

- `HP <= 0` must be treated as terminal even if the current screen type still says `combat_room`.
- Defeat handling needs its own surface or, at minimum, a guard in the controller layer.

## Related

- [mechanics index](/home/igorw/Work/STS2/vault/mechanics/INDEX.md)
- [phrog-parasite](/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/references/act1/elites/phrog-parasite.md)
