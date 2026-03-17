---
name: run-documentation
description: Use this skill when playing a live Slay the Spire 2 run in this repo and you need to keep the per-run markdown log updated floor-by-floor, then rewrite it into a compact gameplay summary with a post mortem when the run ends.
---

# Run Documentation

Use this skill during live STS2 runs in `/home/igorw/Work/STS2`.

## Workflow

1. Keep one markdown file per run in `/home/igorw/Work/STS2/vault/runs`.
2. Append after every floor.
3. Log gameplay only:
   - floor and room type
   - relevant pre-floor state
   - decision taken
   - outcome
   - lesson worth keeping
4. When a run reveals a new or unclear encounter, boss, elite, event, or mechanic:
   - stop and create or update the matching vault note under `/home/igorw/Work/STS2/vault`
   - record the closest STS1 comparison when useful, but mark it as an analogy rather than an exact match
   - link the encounter to any strategy or mechanic note it changed
5. Do not pollute the run log with tooling/debug details unless tooling directly changed gameplay.
6. When the run ends, rewrite the file into a compact gameplay summary.
7. End the final run log with a post mortem covering:
   - final deck
   - relics
   - route/pathing
   - what went right
   - what went wrong
   - what to change next run

## Files To Use

- Run logs: `/home/igorw/Work/STS2/vault/runs`
- Run log template: `/home/igorw/Work/STS2/vault/templates/run-log-template.md`
- Run index: `/home/igorw/Work/STS2/vault/runs/README.md`
- Vault root: `/home/igorw/Work/STS2/vault/README.md`
- Encounter index: `/home/igorw/Work/STS2/vault/encounters/README.md`
