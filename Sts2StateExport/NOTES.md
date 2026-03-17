# STS2 State Export Mod

This mod exposes Slay the Spire 2 state and commands through JSON files in
`~/.local/share/SlayTheSpire2/agent_state`.

## File Map

- `ModEntry.cs`
  - Thin bootstrap only. Hooks the Godot frame loop and delegates immediately.
- `Shared/`
  - Cross-feature contracts, JSON/file IO, scene traversal, the frame coordinator,
    and the reflection catalog split into partial files by surface.
- `Shared/Models/`
  - Runtime-agnostic JSON transport models grouped by surface (`state`, `combat`,
    `run history`, `top bar`, `map`, `browse`).
- `Features/Menu/`
  - Main menu and run-history surfaces. Run-history navigation, state building,
    and history-entry mapping are split into separate modules.
- `Features/Profile/`
  - Save-profile export and profile switching.
- `Features/RunStart/`
  - Singleplayer submenu, character select, custom run, and shared run-start
    helpers.
- `Features/Events/`
  - Generic event export/selection.
- `Features/Events/Neow/`
  - Neow-specific notes and future specialization.
- `Features/TopBar/`
  - Cross-cutting top bar and relic inventory export/commands.
- `Features/Map/`
  - Map export and coordinate-based travel commands.
- `Features/CardViews/`
  - Deck-view and generic card-pile overlays, including sort/close commands.
- `Features/Merchant/`
  - Merchant room and inventory surfaces. Snapshot building, text extraction,
    command execution, and description formatting are isolated modules.
- `Features/Rooms/`
  - Rest-site and treasure-room state machines, including treasure relic picks.
- `Features/Combat/`
  - Combat surface split into screen guards, runtime-state reading, card export,
    creature export, menu/action catalogs, notes, and command execution.
- `Features/Rewards/`
  - Combat rewards and card-reward selection.
- `Properties/AssemblyInfo.cs`
  - Friend-assembly declaration for the deterministic test harness.
- `../Sts2StateExport.Tests/`
  - Lightweight executable self-tests for pure combat and merchant helpers.

## Runtime Contract

- `screen_state.json`
  - Latest exported state for the currently visible supported screen.
- `command.json`
  - A single command request. Commands are deduped by `id` and deleted after
    they are acknowledged so restart does not replay stale work.
- `command_ack.json`
  - Result of the last handled command.

## Design Rules

- Shared files stay runtime-agnostic where possible.
- Feature folders own one game surface each so menu, run-start, and Neow work
  can evolve independently.
- Reflection is centralized in one catalog to avoid hidden private-API lookups
  across the codebase.
- Cross-cutting surfaces use overlay features so the top bar and relics stay
  exported while the primary screen changes.

## Local Checks

- Build the mod: `dotnet build Sts2StateExport/Sts2StateExport.csproj`
- Run the deterministic helper tests:
  `dotnet run --project Sts2StateExport.Tests/Sts2StateExport.Tests.csproj`
