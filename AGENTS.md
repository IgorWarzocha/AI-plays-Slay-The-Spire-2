# STS2 Agent Notes

## Surfaces

- `sts2admin.mjs`: process, window, monitor
- `sts2run.mjs`: main menu, profile, run start
- `sts2ctl.mjs`: non-combat in-run flow
- `sts2combat.mjs`: combat only

## Core Commands

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
- Send actions sequentially. The command file is single-writer.
- Restart after mod DLL changes. Mods are not hot-reload.
- Look for STS1 parallels, but treat them as heuristics, not truth.
- On bosses and elites, check the vault before committing.
- Use screenshots only for unknown or unsupported screens.
- If a gameplay choice is not concretely exposed, fix the exporter before choosing.
- Treat new `godot.log` errors as real bugs and fix them before continuing.
