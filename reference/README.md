# STS2 Reference Library

This directory contains a first-pass local reference library for Slay the Spire 2.

It is intentionally split into:

- `reference/src/`
  - Source adapters, normalization, and query helpers.
- `reference/schema/`
  - The runtime JSON schema for the generated library.
- `scripts/sts2-reference-build.mjs`
  - Rebuilds the local runtime library.
- `scripts/sts2-reference-query.mjs`
  - Queries the generated library by exact id or fuzzy text.
- `scripts/sts2-vault-build.mjs`
  - Builds local per-entity markdown pages under `runtime/vault/`.
- `scripts/sts2-vault-query.mjs`
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
node /home/igorw/Work/STS2/scripts/sts2-reference-build.mjs
```

Query by exact or fuzzy match:

```bash
node /home/igorw/Work/STS2/scripts/sts2-reference-query.mjs bash
node /home/igorw/Work/STS2/scripts/sts2-reference-query.mjs "burning blood"
node /home/igorw/Work/STS2/scripts/sts2-reference-query.mjs neow --kind event
node /home/igorw/Work/STS2/scripts/sts2-reference-query.mjs CARD.BASH --exact
```

Build the operational vault:

```bash
node /home/igorw/Work/STS2/scripts/sts2-vault-build.mjs
```

Query a generated vault page:

```bash
node /home/igorw/Work/STS2/scripts/sts2-vault-query.mjs bash --kind card
node /home/igorw/Work/STS2/scripts/sts2-vault-query.mjs "burning blood" --kind relic
node /home/igorw/Work/STS2/scripts/sts2-vault-query.mjs neow --kind event
```

Return machine-readable JSON:

```bash
node /home/igorw/Work/STS2/scripts/sts2-reference-query.mjs neow --kind event --json
```

## Runtime Notes

- The generated library is English-only for now.
- The local save augmentation is additive metadata, not the canonical data
  source.
- This lane is designed so a future local extractor can replace the bootstrap
  source without changing the generated schema or the query CLI.
