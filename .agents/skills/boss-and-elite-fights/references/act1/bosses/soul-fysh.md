# Soul Fysh

Act 1 boss note captured from a live Ironclad run.

## What It Is

- Boss encounter
- First observed act:
  - Underdocks
- Closest STS1 analogue:
  - `Nemesis`

## What We Observed

- It injects `Beckon` status cards that punish ending turn with them in hand.
- It alternates between pressure turns and setup turns instead of being a flat damage race.
- It can gain `Intangible`, which sharply changes turn value and punishes overcommitting damage into the wrong window.
- Observed intents included:
  - status setup
  - large single hits
  - later mixed attack plus debuff turns
- The fight felt structurally closer to STS1 `Nemesis` than to an STS1 act boss.

## Why It Matters For Play

- Treat it like a `Nemesis`-style patience fight:
  - clear the status cards
  - do not waste high-value damage into `Intangible`
  - plan around future turns, not just current-turn efficiency
- This is not a simple tempo check. A hand that looks playable can still be bad if it leaves `Beckon` behind or dumps too much damage into the wrong phase.
- Resource discipline matters. Potions and premium attacks should be saved for turns that actually convert into damage or survival.

## Why It Matters For Automation

- This encounter is a strong regression test for turn-start combat readiness.
- The exporter/controller must not act on partial hands during `Beckon` turns.
- Runtime state must expose:
  - status-card pressure
  - `Intangible`
  - attack vs setup intent changes
- STS1 analogues are useful as planning hints, but they must be written down as hypotheses, not assumed as exact behavior.

## Related

- [boss-and-elite-fights skill](/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/SKILL.md)
- [ironclad-core-plan](/home/igorw/Work/STS2/.agents/skills/ironclad/references/strategy/ironclad-core-plan.md)
