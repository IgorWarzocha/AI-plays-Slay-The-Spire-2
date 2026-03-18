# STS2 State Export Mod

This mod exposes Slay the Spire 2 state and commands through a Unix domain
socket at `~/.local/share/SlayTheSpire2/agent_ipc/sts2-agent.sock`.

## File Map

- `ModEntry.cs`
  - Thin bootstrap only. Hooks the Godot frame loop and delegates immediately.
- `Shared/`
  - Cross-feature contracts, JSON/socket IO, scene traversal, the frame coordinator,
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

- `sts2-agent.sock`
  - Unix domain socket server hosted inside the mod process.
  - Clients can request a one-shot snapshot on demand.
  - After a command is handled, the mod automatically enters a short
    observation window and pushes snapshots every `250ms` for `3s` so command
    follow-through and animation settling can be observed without permanent idle
    polling.
  - Clients send live command envelopes over the same connection. Commands are
    still deduped by `id`, but no file persistence is used in the hot path.

## Troubleshooting

- See `TROUBLESHOOTING.md` for the mod-loading recovery notes covering:
  - stale `.pck` rebuilds
  - manifest schema requirements
  - loose manifest discovery rules
  - newline-delimited IPC JSON framing

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
