# STS2 Agent Notes

## Surfaces

- `sts2admin.mjs`: process, window, monitor
- `sts2run.mjs`: main menu, profile, run start
- `sts2ctl.mjs`: non-combat in-run flow
- `sts2combat.mjs`: combat only

## Core Commands

- Prefer `sts2-dev.mjs` for build/restart flows instead of raw `dotnet build` plus manual relaunch.
- `sts2-dev.mjs build` and `sts2-dev.mjs restart` already include the STS2 restart cooldown. Do not add manual post-build sleep/status polling unless the script itself is being fixed.
- `node /home/igorw/Work/STS2/scripts/sts2-dev.mjs build`
- `node /home/igorw/Work/STS2/scripts/sts2-dev.mjs test`
- `node /home/igorw/Work/STS2/scripts/sts2-dev.mjs restart`
- `node /home/igorw/Work/STS2/scripts/sts2-dev.mjs continue`
- `node /home/igorw/Work/STS2/scripts/sts2-dev.mjs reload`
- `node /home/igorw/Work/STS2/scripts/sts2run.mjs start-standard`
- `node /home/igorw/Work/STS2/scripts/sts2ctl.mjs status`
- `node /home/igorw/Work/STS2/scripts/sts2combat.mjs status`
- `node /home/igorw/Work/STS2/scripts/sts2ctl.mjs command <action>`
- `node /home/igorw/Work/STS2/scripts/sts2combat.mjs command <action>`
- `node /home/igorw/Work/STS2/scripts/sts2-log-tail.mjs`
- `dotnet run --project /home/igorw/Work/STS2/tools/Sts2TypeInspector/Sts2TypeInspector.csproj -- <TypeFragment>`

## Key Paths

- Repo: `/home/igorw/Work/STS2`
- Exported state: `/home/igorw/.local/share/SlayTheSpire2/agent_state`
- Runtime monitor: `/home/igorw/Work/STS2/runtime/sts2-live.json`
- Game log: `/home/igorw/.local/share/SlayTheSpire2/logs/godot.log`
- Modded save root: `/home/igorw/.local/share/SlayTheSpire2/steam/76561198178272743/modded/profile1`

## Rules

- Keep admin, bootstrap, non-combat, and combat separate.
- After every automated compaction summary, the first action is to re-read the live run state from the exporter and current run artifacts before making any choice. Always confirm the current floor, act, room, path, deck, relics, potions, HP, key upcoming fights, and any other immediately relevant state instead of trusting memory or the summary alone.
- After every new run and after every automated compaction summary, re-read the repo skill that matches the current run before taking action.
- The current character skill is mandatory re-reading after compaction. Example: if the run is Ironclad, re-read `/home/igorw/Work/STS2/.agents/skills/sts2-ironclad/SKILL.md`.
- Re-read `/home/igorw/Work/STS2/.agents/skills/sts2-act-start/SKILL.md` at the start of every act and whenever act-level route planning resets.
- Re-read `/home/igorw/Work/STS2/.agents/skills/sts2-boss-and-elite-fights/SKILL.md` before any elite or boss commitment, including pathing decisions that commit the run toward one.
- Skills do not replace the vault. Each skill lists matching vault notes that are required reading for that situation, and those notes must be read before acting.
- Optimize for fewer tool calls. If a script can return the next usable state directly, patch it to do so.
- Send actions sequentially. The command file is single-writer.
- Restart after mod DLL changes. Mods are not hot-reload.
- Patch command inefficiencies as soon as they show up; the goal is fast, reliable game operation.
- Look for STS1 parallels, but treat them as heuristics, not truth.
- Refine repo skills when durable heuristics are discovered, but do not force a skill when the live run state shows the heuristic does not apply.
- Use screenshots only for unknown or unsupported screens.
- If a gameplay choice is not concretely exposed, fix the exporter before choosing.
- Treat new `godot.log` errors as real bugs and fix them before continuing.
