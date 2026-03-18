# STS CLI Token Consumption and Deduplication Plan

Prepared from a read-only assessment of the current STS CLI surfaces. No game actions were taken during the assessment.

## Scope

Goal: reduce token consumption and repeated information during live STS play via the CLIs, while preserving enough information for reliable decision making.

Implementation note: keep the operator surface simple. Do not add new operator-facing flags for pruning, hashing, timestamps, or pretty printing. The compact behavior should be the default behavior.

## Current implementation status

### Implemented

- P0 compact JSON default output for agent-facing CLIs
- P0 stripping `updatedAtUtc` from non-full output
- P0 pruning null/empty output noise in compact modes
- P0 semantic unchanged-state suppression for repeated `status` polling
- P1 canonical `choices` surface for compact gameplay and selection screens
- P1 default suppression of compact top-bar button boilerplate
- P1 duplicate-label disambiguation for exact card-select actions such as `Strike` vs `Strike+` and multiple `Strike` copies
- P1 preservation of exact control by keeping exact actions whenever aliasing would lose information
- P2 partial compact text normalization for notes, event text, choice descriptions, and common compact combat/relic/potion/card descriptions
- easy-mode status output now omits some unchanged stable sections, currently focused on relics and merchant deck snapshots, while `--hard` remains conservative
- added a dedicated live deck inspection command that opens the deck overlay, captures the live deck view, restores the prior screen, and returns a standard command-style payload with the restored state plus the captured deck snapshot

### Partially implemented

- broader rich-text cleanup is still incomplete; the current pass handles common formatting tags and energy icon normalization, but it is intentionally conservative

### Not yet implemented

- stable-context hashing/delta handling beyond the current easy-mode omission pass
- broader screen-specific compact schemas beyond the current `choices` translation layer
- TOON presentation layer

## Key findings

### 1. `updatedAtUtc` causes constant semantic churn

Repeated status reads on the same screen can differ only because `updatedAtUtc` changes. This defeats cheap dedupe and makes identical states look new to the agent.

### 2. Pretty-printed JSON is expensive

Most surfaces print via `JSON.stringify(..., null, 2)`. This materially increases payload size for no gameplay value in agent-driven flows.

### 3. Null/default/empty noise is common

Common examples:

- `description: null`
- `count: null`
- `usage: null`
- `targets: []`
- full empty potion slot objects
- top bar button boilerplate

### 4. There is structural duplication

The same choice often appears multiple times across:

- `actions`
- `menuItems`
- top bar `buttons`

### 5. Stable context is repeatedly re-emitted

Relics, top bar buttons, and other persistent context are often resent unchanged on every poll.

### 6. Existing compactness controls are underused

`compactCombat` and `compactCollections` exist, but they do not yet drive aggressive pruning of agent-facing output.

## Recommended direction

Empty-string filtering is useful, but it should be part of a broader semantic-pruning and unchanged-state suppression strategy. The first implementation pass should keep JSON as the wire format and make compaction the default behavior. TOON can be evaluated later as a final translator layer once the underlying payload shapes stabilize.

## Priority recommendations

### P0: highest-value changes

#### 1. Add semantic unchanged-state suppression as the default for status polling

Introduce a semantic state key built from a pruned view that excludes volatile fields such as `updatedAtUtc`.

Recommended behavior:

- if unchanged, print nothing
- if changed, print the pruned state

This is the strongest version of “return empty string if nothing changed”.

#### 2. Remove `updatedAtUtc` from easy/hard output by default

Keep timestamps only for existing lossless/debug-oriented full output.

This makes repeated polling much more dedupe-friendly.

#### 3. Default to compact JSON, not pretty JSON

Recommended behavior:

- default: compact single-line JSON

This should apply to agent-facing status/command surfaces.

#### 4. Add a pruning pass after view construction

Implement a generic prune step that removes, where safe:

- `null`
- `undefined`
- `""`
- empty arrays
- empty objects
- schema-default values

Important caveat: do **not** blindly remove all `false` values. Some `false` values are semantically important, such as disabled/occupied/travel flags.

### P1: remove duplicated meaning

#### 5. Canonicalize choices instead of duplicating `actions` and `menuItems`

Instead of separate `actions` and `menuItems`, emit a single canonical `choices` list in agent mode.

Important constraint: canonicalization must never collapse distinct actionable options into one if the operator would lose control. When multiple choices look similar, keep distinct actions and disambiguate the surfaced labels instead of merging them.

Example shape:

```json
{
  "choices": [
    {
      "action": "card_reward.select:reward-card-217cc3a",
      "label": "Barricade",
      "description": "Block is not removed at the start of your turn."
    }
  ]
}
```

Keep the raw split only in `--full`.

#### 6. Omit top bar buttons by default

Top bar buttons are usually boilerplate and duplicate action availability.

Implemented behavior:

- omit by default in compact agent-oriented views
- preserve them in existing full output

#### 7. Suppress empty potion slots more aggressively

Recommended behavior:

- show only occupied potions by default
- rely on top-bar slot counts for capacity
- expose all slots only on potion-relevant screens or via `--potions=all`

### P2: STS-specific compaction

#### 8. Strip rich-text markup from descriptions in agent mode

Examples of noisy markup:

- `[center]`
- `[gold]`
- `[blue]`
- `[green]`

Recommended behavior:

- keep original formatting in `--full`
- emit plain text in agent/easy/hard compact modes

Also drop boilerplate like hotkey-only descriptions unless explicitly requested.

Current caveat: only a limited cleanup pass is implemented so far. Do not aggressively strip markup that may still carry gameplay meaning until there is good coverage for those cases.

#### 9. Split stable run context from volatile screen context

Instead of resending persistent data every poll, emit hashes or change markers for stable collections such as:

- relics
- deck snapshot
- map snapshot

Example direction:

```json
{
  "screenType": "map_screen",
  "hp": "59/87",
  "gold": 121,
  "choices": [],
  "hashes": {
    "relics": "r123",
    "deck": "d456",
    "map": "m789"
  }
}
```

Then allow explicit expansion when needed.

Current implementation note: the first safe pass is intentionally smaller. In easy-mode status polling, some unchanged stable sections can now be omitted between reads. Hard-mode reads remain conservative and should continue to surface the richer planning context.

#### 10. Use minimal screen-specific schemas

Rather than one generalized view carrying too much optional structure, prefer screen-specific minimal forms.

Examples:

- map: current node, travelable nodes, boss, hp/gold
- reward: available choices only
- event: title, plain-text body, choices
- merchant: gold, affordable items, remove option, compact deck context
- combat: already separate, but can be further compacted when useful

## Concrete implementation ideas

### A. Add a `pruneView()` helper

Suggested location:

- `scripts/lib/view-pruning.ts`

Responsibilities:

- drop empty strings
- drop null/undefined
- drop empty arrays/objects
- drop schema-default values where safe
- optionally strip formatting tags

### B. Make agent-facing view types more optional

Suggested file:

- `scripts/lib/types/views.ts`

Current types encourage explicit null materialization. Prefer optional fields for agent-facing compact views where possible.

### C. Add `buildSemanticStateKey()`

Suggested location:

- `scripts/lib/command-state-utils.ts`

Use it for:

- unchanged-state detection
- future delta or cache-based flows

### D. Make current compact flags actually drive pruning

Suggested file:

- `scripts/lib/view-options.ts`

`compactCombat` and `compactCollections` should control real output compaction, not just shallow mode selection.

## Operator-surface constraint

Do not add new operator-facing flags for compaction or dedupe in the first pass. Keep the default behavior simple and automatic.

Potential future flags can be reconsidered only if a real need appears after the default compact surface stabilizes.

## Suggested rollout

### Phase 1: low-risk, high-value

1. compact JSON default
2. drop `updatedAtUtc` from non-full views
3. prune null/empty-string/empty-array/empty-object noise
4. suppress unchanged status output by default using semantic comparison

### Phase 2: structural dedupe

5. canonical `choices` in compact/agent mode
6. omit top bar buttons by default
7. strip formatting markup in compact/agent mode

Status: 5 and 6 are implemented. 7 is partially implemented with a conservative normalization pass.

### Phase 3: best long-term architecture

8. stable-context hashing for relics/deck/map
9. evaluate TOON as a final presentation/translator layer after JSON payloads stabilize

Status: an initial easy-mode stable-section omission pass is implemented, but the broader hashing/delta architecture is still pending.

## Likely files to touch

- `scripts/sts2ctl.ts`
- `scripts/sts2combat.ts`
- `scripts/sts2run.ts`
- `scripts/sts2history.ts`
- `scripts/sts2play.ts`
- `scripts/lib/view-options.ts`
- `scripts/lib/game-view-state-builders.ts`
- `scripts/lib/game-view-common-summarizers.ts`
- `scripts/lib/game-view-combat-summarizers.ts`
- `scripts/lib/game-view-collection-summarizers.ts`
- `scripts/lib/command-state-utils.ts`
- `scripts/lib/types/views.ts`

## Caveats to preserve during implementation

1. Do not remove semantically meaningful `false` values globally.
2. Do not break `--full`; it should remain the lossless/debug surface.
3. Keep enough information for reliable decision making on reward/event/merchant screens.
4. Any unchanged-state suppression should be semantic, not raw-string-based.
5. Consider compatibility for current tests and downstream prompt consumers.

## Short version

If implementing only the most important improvements first, the strongest order is:

1. drop `updatedAtUtc` from easy/hard
2. compact JSON by default
3. prune null/empty/default fields
4. add semantic unchanged-state suppression by default for status reads
5. replace duplicated `actions` + `menuItems` with canonical `choices` in compact mode

Current next slice:

1. extend text normalization only where live evidence shows more safe wins
2. expand stable-context handling only where live evidence shows safe wins, with `--hard` kept conservative
3. consider broader screen-specific compact schemas once the `choices` layer has stabilized in live play
