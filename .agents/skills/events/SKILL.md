---
name: events
description: Use this when the current screen is an event or when planning an event line from the real run state. Trigger it before choosing any event option, especially when the event offers generated cards, relics, gold-for-HP trades, removes, transforms, or branch-defining risk/value choices.
---

# Events

Use this as the event decision workflow for STS2 runs.

## Required Reading

Read these before acting:

- `/home/igorw/Work/STS2/.agents/skills/act-start/references/planning.md`
- `/home/igorw/Work/STS2/.agents/skills/act-start/references/rewards-and-deck-shape.md`
- `/home/igorw/Work/STS2/.agents/skills/events/references/heuristics.md`
- `/home/igorw/Work/STS2/.agents/skills/events/references/known-events.md` if the current event is already documented there
- the current character skill for the run
- the current run log under `/home/igorw/Work/STS2/vault/runs`

If the event is immediately upstream of an elite or boss, also read:

- `/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/SKILL.md`

## Workflow

1. Read the full event state before choosing:
   - title
   - event text
   - every option with concrete payload text
   - trust the live option payload text first; only fall back to local references if the event state is still not concrete enough to choose
2. Reconstruct the live run context:
   - HP and max HP
   - gold
   - deck shape and current bloat
   - relics and potion slots
   - map pressure after the event
   - the run's current bottleneck
3. Classify the event before choosing:
   - damage-control event
   - value event
   - deck-quality event
   - pathing enabler
   - hard-fight prep
   - trap disguised as value
4. Judge each option by this run, not by generic familiarity:
   - what it fixes right now
   - what it worsens
   - what relics, potions, or deck payoffs it synergizes with
   - whether it changes the next hard-fight plan
5. If any option payload is not concrete, stop and fix the exporter before choosing.
6. After choosing, re-read the resulting state if the event changes deck, relics, potions, HP, gold, or pathing permission.

## Guardrails

- Do not evaluate an event in isolation from the route.
- Do not take short-term value and then path like a high-roll deck unless the event actually earned that pivot.
- Do not ignore current relic context. Generated cards and event rewards must be judged against the relic stack already in play.
- Do not assume STS1 event instincts are enough; use them as heuristics only.
- If a new repeatable event heuristic appears, tighten this skill or its references instead of leaving it buried in a run log.

## Maintenance

Keep this skill short and operational. Durable event-specific lessons belong in the owned references; this skill should stay focused on how to think before choosing.
