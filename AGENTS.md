# STS2 Agent Notes

## Surfaces

- `sts2admin.mjs`: process, window, monitor
- `sts2run.mjs`: main menu, profile, run start
- `sts2ctl.mjs`: non-combat in-run flow
- `sts2combat.mjs`: combat only

## Core Commands

- Use `npm run <surface> -- ...`. Do not manually invoke repo scripts with raw `node scripts/...` unless you are explicitly fixing the npm wiring.
- `npm run build`, `npm test`, `npm run restart`, `npm run continue`, `npm run reload`
- `npm run run -- start-standard`
- `npm run ctl -- status`
- `npm run combat -- status`
- `npm run history`, `npm run history:raw`
- `npm run log`
- `npm run inspect -- <TypeFragment>`

## Key Paths

- Repo: `/home/igorw/Work/STS2`
- Exported state: `/home/igorw/.local/share/SlayTheSpire2/agent_state`
- Game log: `/home/igorw/.local/share/SlayTheSpire2/logs/godot.log`
- Modded save root: `/home/igorw/.local/share/SlayTheSpire2/steam/76561198178272743/modded/profile1`

## Rules

- Keep admin, bootstrap, non-combat, and combat separate.
- After every automated compaction summary, the first action is to re-read the live run state from the exporter and current run artifacts before making any choice. Always confirm the current floor, act, room, path, deck, relics, potions, HP, key upcoming fights, and any other immediately relevant state instead of trusting memory or the summary alone.
- After every new run and after every automated compaction summary, re-read the repo skill that matches the current run before taking action.
- The current character skill is mandatory re-reading after compaction. Example: if the run is Ironclad, re-read `/home/igorw/Work/STS2/.agents/skills/ironclad/SKILL.md`.
- Re-read `/home/igorw/Work/STS2/.agents/skills/act-start/SKILL.md` at the start of every act and whenever act-level route planning resets.
- Re-read `/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/SKILL.md` before any elite or boss commitment, including pathing decisions that commit the run toward one.
- Keep encounter notes encounter-specific. If a lesson is really about general combat math, relic accounting, exporter behavior, or sequencing discipline, put it in a general combat/reference note or the run log, not in a boss/elite file.
- Skill-local `references/` folders are the primary evolving knowledge surface. Keep them rewritten and consolidated as we learn. The vault should stay minimal and is primarily for run logs.
- Optimize for fewer tool calls. If a script can return the next usable state directly, patch it to do so.
- Send actions sequentially. The command file is single-writer.
- Restart after mod DLL changes. Mods are not hot-reload.
- Patch command inefficiencies as soon as they show up; the goal is fast, reliable game operation.
- Look for STS1 parallels, but treat them as heuristics, not truth.
- Refine repo skills when durable heuristics are discovered, but do not force a skill when the live run state shows the heuristic does not apply.
- Use screenshots only for unknown or unsupported screens.
- If a gameplay choice is not concretely exposed, fix the exporter before choosing.
- Treat new `godot.log` errors as real bugs and fix them before continuing.
