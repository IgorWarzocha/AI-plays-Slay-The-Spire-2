# STS2 Reference Library

This directory contains a first-pass local reference library for Slay the Spire 2.

It is intentionally split into:

- `reference/src/`
  - Source adapters, normalization, and query helpers.
- `reference/schema/`
  - The runtime JSON schema for the generated library.
- `npm run reference:build`
  - Rebuilds the local runtime library.
- `npm run reference:query -- <query>`
  - Queries the generated library by exact id or fuzzy text.
- `npm run reference:vault:build`
  - Builds local per-entity markdown pages under `runtime/vault/`.
- `npm run reference:vault:query -- <query>`
  - Resolves an entity and prints its generated vault page.
- `runtime/reference-library.json`
  - Generated runtime artifact used during play.
- `runtime/reference-source-summary.json`
  - Generated build/source metadata.

## Current Sources

- `spire-codex-bootstrap`
  - Pulls English `cards`, `relics`, and `events` JSON from the public
    `ptrlrd/spire-codex` repository on GitHub.
  - This is the practical bootstrap path that works now.
- `local-save-augment`
  - Reads local `progress.save` and `current_run.save` to annotate:
    - discovered cards / relics / events
    - cards currently in the run deck
    - relics currently in the run inventory
    - the currently active event

The source adapter boundary is deliberate. The bootstrap source can later be
replaced with a local extractor that reads `SlayTheSpire2.pck` and `sts2.dll`
directly without rewriting the query layer.

## Commands

Build the runtime library:

```bash
npm run reference:build
```

Query by exact or fuzzy match:

```bash
npm run reference:query -- bash
npm run reference:query -- "burning blood"
npm run reference:query -- neow --kind event
npm run reference:query -- CARD.BASH --exact
```

Build the operational vault:

```bash
npm run reference:vault:build
```

Query a generated vault page:

```bash
npm run reference:vault:query -- bash --kind card
npm run reference:vault:query -- "burning blood" --kind relic
npm run reference:vault:query -- neow --kind event
```

Return machine-readable JSON:

```bash
npm run reference:query -- neow --kind event --json
```

## Runtime Notes

- The generated library is English-only for now.
- The local save augmentation is additive metadata, not the canonical data
  source.
- This lane is designed so a future local extractor can replace the bootstrap
  source without changing the generated schema or the query CLI.
