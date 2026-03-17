# Decimillipede

Hive elite note captured from a live Ironclad run.

## What It Is

- Elite encounter
- First observed act:
  - Hive
- Distinctive power:
  - `Reattach`
- Closest STS1 analogue:
  - `Darklings`

## Key Behavior

- The fight starts with three active segments.
- A segment killed while other segments still live is not permanently solved.
- `Reattach` means the fight is really about how many bodies remain active, not how much damage has been dealt in total.
- Observed turn patterns included:
  - mixed single-hit and multi-hit pressure
  - buff turns on live segments
  - revive / heal style turns from dead segments

## Play Notes

- Best quick mental model:
  - `Darklings`, but as an elite with more explicit board-state pressure
- The primary goal is to reduce the number of active segments.
- Damage that does not change the active board can be fake progress.
- Multi-target debuffs are premium here.
  - `Shockwave+` was extremely strong because it cut incoming from every live segment at once.
- Early potion use is often correct if it deletes or nearly deletes one segment.
- Once the board is reduced to one active segment, the fight becomes much more manageable.
- `Feed` should not be valued on segment kills.
  - A dead segment is not a true encounter kill while other segments still live.
  - Treat `Feed` as relevant only on the final real kill, not as a reward for temporary board reduction.

## Failure Mode To Avoid

- Do not tunnel one target just because it is marked or low without thinking about the whole board.
- Do not treat the fight like a standard single-enemy damage race.
- If two or three segments stay active too long, cumulative intent pressure becomes the real threat.

## Automation Notes

- This is a strong test case for:
  - multi-enemy prioritization
  - revive / dead-body state handling
  - distinguishing “dead for now” from “fight simplified”
- The agent should reason in terms of:
  - active segment count
  - revive timer pressure
  - whether a line actually removes a body this turn

## Related

- [[encounters/README]]
- [[strategy/combat-heuristics]]
- [[strategy/ironclad-core-plan]]
