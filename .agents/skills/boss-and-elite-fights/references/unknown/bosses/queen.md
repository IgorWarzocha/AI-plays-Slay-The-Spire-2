# Queen

Boss note captured from a live Ironclad run. This is still a first-pass note and should be refined after the next replay.

## What It Is

- Boss encounter
- First observed act:
  - unknown
- Main side enemy:
  - `Torch Head Amalgam`
- Distinctive player pressure:
  - `Chains of Binding`
- Closest STS1 analogues:
  - `Collector`
  - `Reptomancer`

## Current Read

- This does not look like a pure face-race boss.
- The side body appears to be the real clock.
- `Torch Head Amalgam` creates lethal pressure while Queen takes slower buff or defend turns.
- The likely winning pattern is:
  - kill the add first
  - use the bought time to set up
  - then convert on Queen

## Why The STS1 Parallel Helps

- `Collector`:
  - the boss itself is not always the immediate threat
  - killing the add should either slow the fight or force a resummon window
- `Reptomancer`:
  - ignoring the side pressure and tunneling boss can lose to the board before the boss HP matters

These are heuristics, not identity. The point is the threat model:
- solve the board clock first
- then race the leader

## Mechanics Observed

- Queen can spend turns on `Empower` and `Defensive` patterns instead of raw damage.
- `Torch Head Amalgam` carries the lethal attack pressure.
- `Chains of Binding` means the first `3` cards drawn each turn are afflicted with `Bound`.
- `Bound` is a real play restriction:
  - only `1` `Bound` card can be played each turn
  - cards become unbound at end of turn

## Play Notes

- Do not assume the correct plan is “hit Queen every turn.”
- Treat add removal as time-buying, not as wasted damage.
- On quiet Queen turns, prefer setup that helps solve the add or improves the post-add conversion.
- Re-evaluate the fight immediately if the add dies:
  - if Queen resummons, that is a free window
  - if Queen does not resummon, the fight likely becomes much slower and cleaner

## Hypothesis To Test

- Best first durable hypothesis:
  - killing `Torch Head Amalgam` first is stronger than tunneling Queen
- The next replay should explicitly test:
  - whether the add death forces a resummon or materially slows the fight
  - whether setup becomes safer once the side body is gone

## Failure Mode To Avoid

- Tunneling Queen while the add remains the real damage clock
- Treating `Bound` as generic hand tax instead of planning the one high-impact bound play each turn

## Related

- [boss-and-elite-fights skill](/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/SKILL.md)
- [combat-heuristics](/home/igorw/Work/STS2/.agents/skills/combat/references/strategy/combat-heuristics.md)
- [elite-and-boss-prep](/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/references/strategy/elite-and-boss-prep.md)
