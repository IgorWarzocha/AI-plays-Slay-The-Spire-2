# STS2 State Export Troubleshooting

## Mod loads in UI but agent state stays null

### Symptoms

- `npm run build` restarts the game, but the restart step times out waiting for a
  fresh heartbeat.
- `npm run admin -- status` shows `running: true` with `state: null` and
  `ack: null`.
- `npm run monitor` also returns `state: null` and `ack: null`.
- `~/.local/share/SlayTheSpire2/logs/godot.log` contains:

  - `Found mod manifest file .../mods/Sts2StateExport/mod_manifest.json`
  - `Neither a DLL nor a PCK was loaded for mod Sts2StateExport, something seems wrong!`

### Root causes we hit

1. The installed `Sts2StateExport.pck` was stale.
   - The repo was rebuilding the DLL, but not regenerating and reinstalling the
     `.pck` alongside it.
2. The manifest field names must match the game's JSON contract.
   - STS2 deserializes `MegaCrit.Sts2.Core.Modding.ModManifest` using snake_case
     JSON names, not camelCase.
   - Working fields are:
     - `id`
     - `name`
     - `author`
     - `description`
     - `version`
     - `has_dll`
     - `has_pck`
     - `affects_gameplay`
   - `dll_name` and `pck_name` are not part of the current runtime manifest type.
3. After the mod started loading again, the socket bridge still had a framing bug.
   - The Node client treats each newline as a complete JSON message.
   - Pretty-printed multiline JSON from the mod broke the client parser.

## Important runtime behavior

### How mod discovery works

The game discovers mods by recursively scanning for loose `.json` files under the
mods directory. In the current runtime, `ReadModsInDirRecursive(...)` logs every
`.json` file it finds and passes it into `ReadModManifest(...)`.

That means:

- a loose `mods/Sts2StateExport/mod_manifest.json` is required for discovery
- the DLL and PCK are then loaded by convention from the same directory as:
  - `Sts2StateExport.dll`
  - `Sts2StateExport.pck`
- those filenames must match the manifest `id`

The `.pck` can still include `mod_manifest.json`, but that is not enough for the
initial discovery pass.

## Fixes applied

### 1) Repack the PCK during normal builds

File: `scripts/sts2-dev.ts`

- `npm run build` now:
  1. builds `Sts2StateExport.dll`
  2. regenerates `mods/Sts2StateExport/Sts2StateExport.pck`
  3. restarts the game

The pack step uses the game executable itself in headless mode plus
`tools/pack_mod.gd`, so no separate Godot install is required.

### 2) Keep the manifest in the correct schema

File: `Sts2StateExport/mod_manifest.json`

Working manifest:

```json
{
  "id": "Sts2StateExport",
  "name": "Sts2StateExport",
  "author": "Codex",
  "description": "Exports live Slay the Spire 2 screen state for agent tooling.",
  "version": "1.0.0",
  "has_dll": true,
  "has_pck": true,
  "affects_gameplay": true
}
```

### 3) Keep the loose manifest installed

The loose installed file at:

- `/run/media/igorw/Steam/SteamLibrary/steamapps/common/Slay the Spire 2/mods/Sts2StateExport/mod_manifest.json`

must remain present, because the game discovers mods from loose `.json` files on
disk before it decides whether to load the DLL or PCK.

### 4) Serialize IPC responses as one-line JSON

Files:

- `Sts2StateExport/Shared/AgentIpcJson.cs`
- `Sts2StateExport/Shared/AgentIpcServer.cs`

The IPC server now uses a non-indented serializer for socket responses so each
newline-delimited frame is a complete JSON object.

## Verification checklist

### Rebuild and relaunch

```bash
npm run build
```

Expected positive log lines:

- `Found mod manifest file .../mod_manifest.json`
- `Loading assembly DLL .../Sts2StateExport.dll`
- `Loading Godot PCK .../Sts2StateExport.pck`
- `Finished mod initialization for 'Sts2StateExport' (Sts2StateExport).`

Quick check:

```bash
rg -n 'Found mod manifest|Loading assembly DLL|Loading Godot PCK|Finished mod initialization|Neither a DLL nor a PCK was loaded' ~/.local/share/SlayTheSpire2/logs/godot.log -S
```

### Confirm agent visibility

```bash
npm run admin -- status
npm run monitor
```

Healthy result:

- `running: true`
- `state` is non-null

### Resume the current run

```bash
npm run continue
```

## If this breaks again

Check these in order:

1. Does the installed mod directory contain all three files?
   - `mod_manifest.json`
   - `Sts2StateExport.dll`
   - `Sts2StateExport.pck`
2. Does the manifest still use snake_case keys?
3. Does the manifest `id` still exactly match the DLL/PCK basename?
4. Does `godot.log` show `Loading assembly DLL` and `Loading Godot PCK`?
5. If the mod loads but the client throws JSON parse errors, inspect IPC
   formatting before touching gameplay/runtime logic.

## Files changed in this recovery

- `scripts/sts2-dev.ts`
- `tools/pack_mod.gd`
- `Sts2StateExport/mod_manifest.json`
- `Sts2StateExport/Shared/AgentIpcJson.cs`
- `Sts2StateExport/Shared/AgentIpcServer.cs`

