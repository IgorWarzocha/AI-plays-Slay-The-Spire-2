# STS2 Agent Notes

Minimal repo-local reference for the commands and paths this workspace uses most.

## Core Commands

- `node /home/igorw/Work/STS2/scripts/sts2ctl.mjs status`
  - Show live window, exported state, and last command ack.
- `node /home/igorw/Work/STS2/scripts/sts2ctl.mjs launch`
  - Launch STS2 and wait for a fresh exporter heartbeat.
- `node /home/igorw/Work/STS2/scripts/sts2ctl.mjs restart`
  - Close and relaunch STS2.
- `node /home/igorw/Work/STS2/scripts/sts2ctl.mjs quit`
  - Close STS2.
- `node /home/igorw/Work/STS2/scripts/sts2ctl.mjs command <action>`
  - Send one exported action such as `main_menu.continue`, `map.travel:0,3`, or `merchant.open`.
- `node /home/igorw/Work/STS2/read-sts2-state.mjs`
  - Compact human-readable state dump.

## Build Commands

- `dotnet build /home/igorw/Work/STS2/Sts2StateExport/Sts2StateExport.csproj`
  - Build the mod and copy the DLL into the game mods folder.
- `dotnet build /home/igorw/Work/STS2/tools/Sts2TypeInspector/Sts2TypeInspector.csproj`
  - Build the assembly inspection utility.
- `dotnet run --project /home/igorw/Work/STS2/tools/Sts2TypeInspector/Sts2TypeInspector.csproj -- <TypeFragment>`
  - Inspect STS2 runtime types and members.

## Important Paths

- Repo root: `/home/igorw/Work/STS2`
- Game mods dir:
  - `/run/media/igorw/Steam/SteamLibrary/steamapps/common/Slay the Spire 2/mods/Sts2StateExport`
- Exported state dir:
  - `/home/igorw/.local/share/SlayTheSpire2/agent_state`
- Runtime monitor output:
  - `/home/igorw/Work/STS2/runtime/sts2-live.json`
- Game log:
  - `/home/igorw/.local/share/SlayTheSpire2/logs/godot.log`
- Modded save root:
  - `/home/igorw/.local/share/SlayTheSpire2/steam/76561198178272743/modded/profile1`

## Working Pattern

- Prefer `sts2ctl.mjs command ...` over synthetic input.
- Restart after every mod DLL change. Mods are not hot-reload.
- Use screenshots only to validate genuinely unknown screens; normal control should stay model-backed.
- Treat new console errors in `godot.log` as real bugs and fix them before continuing.
