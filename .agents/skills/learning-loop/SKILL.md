---
name: learning-loop
description: Use this when playing in this repo and you need to keep the run log, reference notes, mechanic notes, and strategy notes updated as durable learning. Trigger it during live runs, immediately after meaningful floors, immediately after elite or boss fights and boss rewards, when a new boss/elite/event/mechanic appears, when a fight needs STS1 parallels to understand what it is testing, and when ending a run so the post mortem can be reconciled against Compendium -> Run History before the final rewrite.
---

# Learning Loop

Keep long-lived game knowledge in the repo while the run is happening. The goal is not a technical trace. The goal is reusable play knowledge.

## Required Reading

Read these before doing learning-loop maintenance:

- `/home/igorw/Work/STS2/.agents/skills/learning-loop/references/run-log-standard.md`
- `/home/igorw/Work/STS2/.agents/skills/learning-loop/references/note-promotion.md`

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
   - update the owning skill reference instead of creating a new vault note by default
   - first write the shortest honest read of the thing:
     - what am I seeing?
     - what is it actually testing?
     - what does it remind me of?
   - write the closest STS1 parallel when useful
   - mark that parallel as a heuristic, not identity
5. After every elite or boss attempt:
   - write a short fight post mortem, even if the fight was won
   - keep it to the smallest durable lesson set: what the fight tested, what line was wrong or right, and what changes next attempt
   - update the owning skill reference only if the lesson is reusable beyond this one run
   - do this before resuming normal play, not later from memory
6. When the run ends:
   - first read `Compendium -> Run History` through the repo CLI and use it as the authoritative run-end snapshot
   - use the exported floor timeline to find where the run actually turned, not just where it died
   - reconcile the post mortem against the authoritative seed, floor reached, death source, final deck, and relics
   - then rewrite the run log into a compact summary
   - end with a post mortem

## What To Record

- Encounters:
  - what the fight actually tests
  - distinctive powers or phase changes
  - what mistake pattern loses the fight
  - closest STS1 analogue if it helps
  - if the encounter was initially unclear, the final “this is really a X-shaped fight” summary
  - for elites and bosses, a per-attempt post mortem and the adjustment for the next attempt
- Mechanics:
  - what the surface really means in play
  - what the exporter/controller must understand
- Strategy:
  - durable heuristics, not one-off anecdotes
  - route logic, combat heuristics, shop heuristics, reward heuristics

## Ownership Rule

- Keep the vault minimal.
- Run-specific notes belong in `/home/igorw/Work/STS2/vault/runs`.
- Reusable lessons belong in the owning skill under `/home/igorw/Work/STS2/.agents/skills/*/references/`.
- Prefer rewriting and merging existing references over creating tiny new notes.

## Run Log Standard

- Use `/home/igorw/Work/STS2/.agents/skills/learning-loop/references/run-log-standard.md`.
- Floor notes are for live context compression.
- Final run notes are for learning.
- End-of-run facts should be reconciled against `node /home/igorw/Work/STS2/scripts/sts2history.mjs latest` or `npm run history`.
- If you need the full floor payload, use `node /home/igorw/Work/STS2/scripts/sts2history.mjs latest --raw`.
- The finished version must include:
  - final deck
  - relics
  - seed, floor reached, and result source from run history
  - route/pathing
  - what went right
  - what went wrong
  - what to change next run

## Guardrails

- Do not write tooling noise unless tooling changed gameplay.
- Do not leave a new encounter undocumented if it changed how the run should be played.
- Do not assume STS1 knowledge transfers cleanly; use it as a shortcut only when the analogy is actually helpful.
- For new bosses and elites, push the identification loop before action: what am I seeing, what is the clock, what STS1 fight is the closest useful parallel.
- If a lesson is general, move it to strategy or mechanics instead of burying it in a single run log.
- If a new repeatable self-learning pattern appears, update this skill so the behavior is explicit next time instead of relying on memory.
- Keep notes compact. Prefer one sharp takeaway over a bloated recap.

## Files To Use

- Run logs: `/home/igorw/Work/STS2/vault/runs`
- Act planning and rewards: `/home/igorw/Work/STS2/.agents/skills/act-start/references`
- Hard fights: `/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/references`
- Combat heuristics and mechanics: `/home/igorw/Work/STS2/.agents/skills/combat/references`
- Events: `/home/igorw/Work/STS2/.agents/skills/events/references`
- Ironclad: `/home/igorw/Work/STS2/.agents/skills/ironclad/references`
- Merchant: `/home/igorw/Work/STS2/.agents/skills/merchant/references`
- Learning-loop standards: `/home/igorw/Work/STS2/.agents/skills/learning-loop/references`
