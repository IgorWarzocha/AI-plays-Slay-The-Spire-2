---
name: act2
description: Use this at the start of Act 2 and for Act 2 route, reward, elite, boss, and survival decisions. Trigger it when Act 2 begins, whenever Act 2 pathing changes, before Act 2 elite commitments, and when documenting new Act 2 encounters.
---

# Act 2

Use this as the Act 2 operating note. The goal is to turn an Act 1 winner into a deck that can survive repeated high-pressure turns without drifting into fake safety.

## Required Reading

Read these before acting in Act 2:

- `/home/igorw/Work/STS2/.agents/skills/act2/references/core-plan.md`
- `/home/igorw/Work/STS2/.agents/skills/act2/references/pathing-and-thresholds.md`
- the current character skill for the run
- the live run log under `/home/igorw/Work/STS2/vault/runs`
- the relevant file under `/home/igorw/Work/STS2/.agents/skills/act2/elites/` or `/home/igorw/Work/STS2/.agents/skills/act2/bosses/` if the encounter is known

If the path is committing into an elite or the boss right now, also read:

- `/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/SKILL.md`

## Core Doctrine

- Act 2 tests whether the deck's defense and scaling are real, not whether it had one good Act 1 damage package.
- Frontload still matters, but many Act 2 losses come from failing to convert low-pressure turns into the right kind of future position.
- Elites are not earned by HP alone. They are earned by concrete answers to large multi-attacks, defend-plus-buff cycles, and awkward redraws.
- Potion capacity matters more in Act 2 because the fights are much more likely to hinge on one breakpoint defensive or lethal turn.
- Shops, fires, and route branches should be judged through the next hard check, not through generic value.

## Workflow

1. Confirm the boss, current floor, and immediate route chunk.
2. Rebuild the real deck shape for Act 2:
   - frontload
   - sustainable defense
   - scaling
   - draw/energy smoothing
   - potion quality
   - whether key defense is reusable, limited, or one-shot
3. Count how many elites the deck has earned right now.
4. Check whether the next shop, event, or fire changes that answer.
5. For known Act 2 hard fights, read the encounter file before committing.
6. After each meaningful Act 2 floor, promote new durable lessons into this skill instead of burying them in the run log.

## Ownership

- Act 2 route logic and threshold rules belong under `/home/igorw/Work/STS2/.agents/skills/act2/references/`.
- Confirmed Act 2 elites belong under `/home/igorw/Work/STS2/.agents/skills/act2/elites/`.
- Confirmed Act 2 bosses belong under `/home/igorw/Work/STS2/.agents/skills/act2/bosses/`.
- General cross-act hard-fight heuristics stay under `/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/`.

## Maintenance

Keep this skill practical. Move confirmed Act 2 content here so the general hard-fight reference stays compact.
