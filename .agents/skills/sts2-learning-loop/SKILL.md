---
name: sts2-learning-loop
description: Use this when playing Slay the Spire 2 in this repo and you need to keep the run log, encounter notes, mechanic notes, and strategy vault updated as durable learning. Trigger it during live runs, immediately after meaningful floors, immediately after elite or boss fights and boss rewards, when a new boss/elite/event/mechanic appears, and when rewriting the finished run into a compact gameplay post mortem.
---

# STS2 Learning Loop

Keep long-lived game knowledge in the repo while the run is happening. The goal is not a technical trace. The goal is reusable play knowledge.

## Core Workflow

1. Keep one live run log in `/home/igorw/Work/STS2/vault/runs`.
2. Append after every floor that changes the run in a meaningful way.
3. Log gameplay only:
   - room and floor
   - relevant state before the floor
   - decision taken
   - outcome
   - lesson worth keeping
4. When a run reveals a new or unclear encounter, event, mechanic, or heuristic:
   - create or update the matching note under `/home/igorw/Work/STS2/vault`
   - write the closest STS1 parallel when useful
   - mark that parallel as a heuristic, not identity
5. After every elite or boss attempt:
   - write a short fight post mortem, even if the fight was won
   - keep it to the smallest durable lesson set: what the fight tested, what line was wrong or right, and what changes next attempt
   - update the encounter or strategy vault note only if the lesson is reusable beyond this one run
   - do this before resuming normal play, not later from memory
6. When the run ends:
   - rewrite the run log into a compact summary
   - end with a post mortem

## What To Record

- Encounters:
  - what the fight actually tests
  - distinctive powers or phase changes
  - what mistake pattern loses the fight
  - closest STS1 analogue if it helps
  - for elites and bosses, a per-attempt post mortem and the adjustment for the next attempt
- Mechanics:
  - what the surface really means in play
  - what the exporter/controller must understand
- Strategy:
  - durable heuristics, not one-off anecdotes
  - route logic, combat heuristics, shop heuristics, reward heuristics

## Run Log Standard

- Use `/home/igorw/Work/STS2/vault/runs/README.md` and `/home/igorw/Work/STS2/vault/templates/run-log-template.md`.
- Floor notes are for live context compression.
- Final run notes are for learning.
- The finished version must include:
  - final deck
  - relics
  - route/pathing
  - what went right
  - what went wrong
  - what to change next run

## Guardrails

- Do not write tooling noise unless tooling changed gameplay.
- Do not leave a new encounter undocumented if it changed how the run should be played.
- Do not assume STS1 knowledge transfers cleanly; use it as a shortcut only when the analogy is actually helpful.
- If a lesson is general, move it to strategy or mechanics instead of burying it in a single run log.
- If a new repeatable self-learning pattern appears, update this skill so the behavior is explicit next time instead of relying on memory.
- Keep notes compact. Prefer one sharp takeaway over a bloated recap.

## Files To Use

- Run logs: `/home/igorw/Work/STS2/vault/runs`
- Encounter notes: `/home/igorw/Work/STS2/vault/encounters`
- Mechanics notes: `/home/igorw/Work/STS2/vault/mechanics`
- Strategy notes: `/home/igorw/Work/STS2/vault/strategy`
