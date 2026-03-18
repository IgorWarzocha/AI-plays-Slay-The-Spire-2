# AI Plays Slay The Spire 2

Work in progress.

Demo:

- [Video clip](https://x.com/Howaboua/status/2033671275646718027?s=20)

Right now, the agent is effectively able to read and interact with nearly everything in the game while reading precise descriptions and states.

It has already made it through the first act boss with Ironclad, with some questionable decisions along the way.

GPT-5.4 is playing. It knows STS1 well enough to make educated decisions, but STS2 is treated as similar-not-identical, so the repo explicitly documents parallels instead of assuming they are exact.

## What This Repo Is

This repo is building an agent stack for *Slay the Spire 2*.

The current approach is:

- export game state directly from a Godot/C# mod instead of relying on OCR
- drive the game through small CLI surfaces
- keep decision-making skill-driven
- document runs, encounters, mechanics, and heuristics so play improves over time

## Current Status

Already working to a meaningful degree:

- main menu and run bootstrap
- map travel
- event and ancient choice reading
- merchant reads and purchases
- combat state reads and card play
- relic, potion, deck, and top-bar state
- compendium run-history extraction, including floor-by-floor data

This is not stable or finished yet. Expect:

- refactors
- broken edges
- incomplete screen coverage
- heuristics being rewritten as the agent learns

## Repo Shape

- `.agents/skills/`
  Repo-local skills and their owned reference notes.
- `Sts2StateExport/`
  The STS2 runtime export mod.
- `scripts/`
  JS CLIs for gameplay, admin, reload, history, and developer workflows.
- `vault/runs/`
  Run logs and post mortems.
- `.agents/skills/*/references/`
  Evolving play knowledge, mechanics notes, encounter reads, and heuristics owned by each skill.
- `reference/`
  Local reference-library tooling and generated helpers.

## Main Commands

Use the npm surfaces rather than calling scripts directly.

```bash
npm run build
npm test
npm run admin -- status
npm run run -- start-standard
npm run ctl -- status
npm run combat -- status
npm run history
npm run history:raw
```

Useful reload flows:

```bash
npm run restart
npm run continue
npm run reload
npm run reload:continue
npm run reload:save-quit
npm run reload:cycle
```

Useful inspection flows:

```bash
npm run play -- inspect-deck
npm run play -- inspect-draw
npm run play -- inspect-discard
npm run play -- inspect-exhaust
```

## CLI Output Modes

Agent-facing CLI surfaces now default to compact single-line JSON with pruning and repeated-state dedupe where safe.

- default / `--easy`: compressed execution surface
- `--hard`: richer planning surface with more context preserved
- `--full`: lossless/debug-oriented surface

Compact output also includes:

- canonical `choices` instead of duplicated action/menu surfaces in compact views
- stable merchant buy aliases when unique
- auto-closing deck and pile inspection commands that restore the prior screen and return the captured snapshot plus restored state

## Design Principles

- No OCR by default if the runtime can expose the state directly.
- STS1 knowledge is useful, but only as heuristic guidance.
- New encounters, mechanics, and repeated mistakes should become durable repo knowledge.
- Scripts should return the next usable state directly whenever possible.

## Goal

Build an agent that can:

1. read STS2 state reliably without OCR,
2. operate the game through clean command surfaces,
3. improve its play through repo-local skills and documentation,
4. eventually win runs consistently rather than just navigate the client.
