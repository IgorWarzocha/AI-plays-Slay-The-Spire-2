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
  - Default mode is strict: the command waits for a real exported state mutation instead of trusting the first ack blindly.
- `node /home/igorw/Work/STS2/scripts/sts2-log-tail.mjs`
  - Show an agent-focused tail of `godot.log` with exporter errors and command-relevant gameplay lines only.
- `node /home/igorw/Work/STS2/scripts/sts2-reference-build.mjs`
  - Rebuild the local card/relic/event reference library.
- `node /home/igorw/Work/STS2/scripts/sts2-reference-query.mjs <query>`
  - Query the reference library directly.
- `node /home/igorw/Work/STS2/scripts/sts2-vault-build.mjs`
  - Build local markdown vault pages in `/home/igorw/Work/STS2/runtime/vault`.
- `node /home/igorw/Work/STS2/scripts/sts2-vault-query.mjs <query>`
  - Resolve an entity and print its generated vault page.
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
- Send gameplay commands sequentially. `sts2ctl.mjs` uses a single command file, so parallel action writes will race and lose a command.
- Restart after every mod DLL change. Mods are not hot-reload.
- Use screenshots only to validate genuinely unknown screens; normal control should stay model-backed.
- Treat new console errors in `godot.log` as real bugs and fix them before continuing.

## Documentation Loop

- Maintain the Obsidian-style learning vault under `/home/igorw/Work/STS2/vault`.
- After any new encounter, mechanic, or reusable control pattern appears, add or update a vault note before continuing normal play.
- Prefer one note per concept:
  - encounter
  - mechanic
  - automation pattern
- Every note should capture:
  - what was observed
  - why it matters for play
  - why it matters for automation
- Start from:
  - `/home/igorw/Work/STS2/vault/README.md`
  - `/home/igorw/Work/STS2/vault/automation/auto-advance-opportunities.md`
