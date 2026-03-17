---
name: combat
description: Use this for normal combat planning and turn execution. Trigger it before taking combat turns, when a fight presents setup vs tempo tension, when cost changes or free-card effects appear, and whenever you need general combat heuristics that are not boss-or-elite specific.
---

# Combat

Use this as the default fight workflow for STS2 turns.

## Required Reading

Read these before acting:

- `/home/igorw/Work/STS2/.agents/skills/combat/references/strategy/combat-heuristics.md`
- the current run log under `/home/igorw/Work/STS2/vault/runs`

If the run is Ironclad, also read:

- `/home/igorw/Work/STS2/.agents/skills/ironclad/SKILL.md`

If the fight is an elite or boss, also read:

- `/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/SKILL.md`

## Workflow

1. Read the settled combat state only:
   - energy
   - hand
   - costs
   - intents
   - powers and debuffs
   - potions
2. Classify the turn:
   - setup turn
   - survival turn
   - damage race
   - cleanup turn
3. Identify what matters most over the next cycle:
   - incoming damage
   - draw pile pollution
   - scaling
   - body count
   - breakpoints for lethal or a safer next shuffle
4. Commit the line that improves position, not just current-turn efficiency.
5. After any draw burst, cost mutation, free-card effect, or state-changing power:
   - stop
   - re-read
   - only then spend the rest of the turn

## Guardrails

- STS1 parallels are heuristics, not proof.
- Do not spend all energy just because it is available.
- Do not batch past temporary free cards or cost changes.
- Do not use potions just to smooth an average turn; use them when they change setup, survival, or lethal math.
- If combat state is not concretely exposed, stop and fix the surface before acting.

## Maintenance

Keep this skill short. Move durable lessons into the owned references, then refine this workflow when repeated combat mistakes or better patterns appear.
