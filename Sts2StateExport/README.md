# STS2 State Export Mod

This mod exposes Slay the Spire 2 state and commands through JSON files in
`~/.local/share/SlayTheSpire2/agent_state`.

## File Map

- `ModEntry.cs`
  - Thin bootstrap only. Hooks the Godot frame loop and delegates immediately.
- `Shared/`
  - Cross-feature contracts, JSON/file IO, scene traversal, reflection catalog,
    and the frame coordinator.
- `Features/Menu/`
  - Main menu export and command execution.
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
  - Merchant room and inventory surfaces, including native purchase commands.
- `Features/Rooms/`
  - Rest-site and treasure-room state machines, including treasure relic picks.
- `Features/Combat/`
  - Combat state export and model-backed play/end-turn commands.
- `Features/Rewards/`
  - Combat rewards and card-reward selection.

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
