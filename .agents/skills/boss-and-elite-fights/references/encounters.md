# Encounters

Use this note for known elite and boss reads. Keep it compact, but preserve the durable threat model for each fight.

## Soul Fysh

### What It Is

- Boss encounter
- First observed act:
  - Underdocks
- Closest STS1 analogue:
  - `Nemesis`

### What We Observed

- It injects `Beckon` status cards that punish ending turn with them in hand.
- It alternates between pressure turns and setup turns instead of being a flat damage race.
- It can gain `Intangible`, which sharply changes turn value and punishes overcommitting damage into the wrong window.
- Observed intents included:
  - status setup
  - large single hits
  - later mixed attack plus debuff turns
- The fight felt structurally closer to STS1 `Nemesis` than to an STS1 act boss.

### Why It Matters

- Treat it like a `Nemesis`-style patience fight:
  - clear the status cards
  - do not waste high-value damage into `Intangible`
  - plan around future turns, not just current-turn efficiency
- This is not a simple tempo check. A hand that looks playable can still be bad if it leaves `Beckon` behind or dumps too much damage into the wrong phase.
- Resource discipline matters. Potions and premium attacks should be saved for turns that actually convert into damage or survival.

## Phrog Parasite

### What It Is

- Elite encounter
- First observed act:
  - Overgrowth
- Distinctive power:
  - `Infested`
- Closest STS1 analogue:
  - `Slime Boss`

### Key Behavior

#### Parasite phase

- Turn 1 observed as setup or infection pressure, not direct damage.
- Turn 2 observed as a `4x4` multi-attack.
- Additional setup turns can inject `Infection` cards into the player draw cycle.

#### Death transition

On death, `Infested` spawns four `Wriggler` enemies.

This is not the end of the encounter.

### Spawned Wriggler Board

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

### Play Notes

- Best quick mental model:
  - `Slime Boss` as an elite, with status clutter layered on top
- `Havoc` is strong here when the top draw is known, because it can convert into a high-impact attack before the parasite's first real damage turn.
- Killing the parasite too casually can be dangerous if the resulting `Wriggler` board is not already represented correctly in state.
- `Infection` clutter materially changes hand quality, so exhausting real cards has extra cost.
- The real danger is tempo loss after the split. A deck that only plans around the main body can get rolled by the remaining wriggler turns.
- This encounter can produce near-dead turns where the hand is mostly or entirely `Infection`. That sharply increases the value of draw quality, exhaust control, and any line that prevents the fight from dragging.

### Durable Lessons

- `True Grit+` forced the discovery of combat hand-selection as a real combat submode.
- The spawn board confirmed that combat export can survive enemy replacement and still expose correct target ids.
- This encounter should be treated as a documentation-mandatory elite because it has a real phase transition, not just bigger numbers.
- A seemingly safe line can become lethal if the post-split board survives long enough to stuff the hand with status cards.
- The run ended with the final wriggler not attacking. Two `Infection` cards in hand at `2 HP` were enough to kill the player on end turn. This fight absolutely punishes “I stabilized the board” thinking if the hand is still clogged.

## Decimillipede

### What It Is

- Elite encounter
- First observed act:
  - Hive
- Distinctive power:
  - `Reattach`
- Closest STS1 analogue:
  - `Darklings`

### Key Behavior

- The fight starts with three active segments.
- A segment killed while other segments still live is not permanently solved.
- `Reattach` means the fight is really about how many bodies remain active, not how much damage has been dealt in total.
- Observed turn patterns included:
  - mixed single-hit and multi-hit pressure
  - buff turns on live segments
  - revive or heal style turns from dead segments

### Play Notes

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

### Failure Mode To Avoid

- Do not tunnel one target just because it is marked or low without thinking about the whole board.
- Do not treat the fight like a standard single-enemy damage race.
- If two or three segments stay active too long, cumulative intent pressure becomes the real threat.

## The Insatiable

### What It Is

- Boss encounter
- First observed act:
  - Hive
- Closest STS1 analogue:
  - none locked in yet

### What We Observed

- The fight alternates between pressure turns and setup turns instead of asking for constant full-blocking.
- `Sandpit` is a real fight mechanic, not flavor text. The generated `Frantic Escape` cards change positioning pressure and need to be valued as fight text, not as junk.
- `Vulnerable` windows matter a lot. The clean winning line came from extending `Vulnerable`, then cashing a damage window with heavy attacks and potion damage.
- The boss rewards patience on buff turns and punishes lazy “always spend energy on tempo” lines on attack turns.

### Why It Matters

- Read the turn in terms of window type first:
  - setup or buff turn
  - attack turn
- On setup turns, prioritize scaling or high-conversion damage.
- On attack turns, decide whether `Sandpit` or block is the real problem before spending energy.
- Do not force a fake STS1 comparison if the mechanic itself is clearer than the analogy.

### Boss Post Mortem

- What the fight tested:
  - whether the run could distinguish damage windows from survival windows
  - whether temporary fight cards like `Frantic Escape` were treated as mechanic text instead of generic clutter
- What line was right:
  - using the non-attack turn to extend `Vulnerable`, convert potion damage, and hold back on pointless blocking
- What changes next attempt:
  - respect `Sandpit` earlier
  - keep looking for lethal windows before defaulting to medium-value block lines

## Queen

### What It Is

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

### Current Read

- This does not look like a pure face-race boss.
- The side body appears to be the real clock.
- `Torch Head Amalgam` creates lethal pressure while Queen takes slower buff or defend turns.
- The likely winning pattern is:
  - kill the add first
  - use the bought time to set up
  - then convert on Queen

### Why The STS1 Parallel Helps

- `Collector`:
  - the boss itself is not always the immediate threat
  - killing the add should either slow the fight or force a resummon window
- `Reptomancer`:
  - ignoring the side pressure and tunneling boss can lose to the board before the boss HP matters

These are heuristics, not identity. The point is the threat model:

- solve the board clock first
- then race the leader

### Mechanics Observed

- Queen can spend turns on `Empower` and `Defensive` patterns instead of raw damage.
- `Torch Head Amalgam` carries the lethal attack pressure.
- `Chains of Binding` means the first `3` cards drawn each turn are afflicted with `Bound`.
- `Bound` is a real play restriction:
  - only `1` `Bound` card can be played each turn
  - cards become unbound at end of turn

### Play Notes

- Do not assume the correct plan is “hit Queen every turn.”
- Treat add removal as time-buying, not as wasted damage.
- On quiet Queen turns, prefer setup that helps solve the add or improves the post-add conversion.
- Re-evaluate the fight immediately if the add dies:
  - if Queen resummons, that is a free window
  - if Queen does not resummon, the fight likely becomes much slower and cleaner

### Hypothesis To Test

- Best first durable hypothesis:
  - killing `Torch Head Amalgam` first is stronger than tunneling Queen
- The next replay should explicitly test:
  - whether the add death forces a resummon or materially slows the fight
  - whether setup becomes safer once the side body is gone

### Failure Mode To Avoid

- Tunneling Queen while the add remains the real damage clock
- Treating `Bound` as generic hand tax instead of planning the one high-impact bound play each turn

## Living Rule

Keep this note evolving. Rewrite sections when the threat model gets clearer instead of creating one more encounter fragment.
