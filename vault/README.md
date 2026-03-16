# STS2 Vault

This is the persistent handwritten knowledge base for Slay the Spire 2.

Use it like an Obsidian vault:

- one note per concept
- wiki links between notes
- concise writeups that help both play and automation
- notes should survive across runs instead of being tied to one exporter snapshot
- every run gets its own append-only markdown log

The generated reference library in `runtime/` is separate. That is raw searchable data. This vault is where learned judgment lives.

## Start Here

- [[encounters/README]]
- [[mechanics/README]]
- [[automation/README]]
- [[strategy/README]]
- [[runs/README]]

## Note Standard

Each note should answer four questions:

1. What is it?
2. What did we observe?
3. Why does it matter for play?
4. Why does it matter for automation?

When a new encounter, mechanic, or screen appears:

1. add or update the relevant note
2. link it from the appropriate index
3. record any safe auto-advance or control implication
4. only then continue normal play

During a run:

1. create one run log in `vault/runs/`
2. append after every floor
3. turn repeated lessons into encounter, mechanic, automation, or strategy notes

## Seed Notes

- [[encounters/act1/phrog-parasite]]
- [[mechanics/combat-hand-selection]]
- [[automation/auto-advance-opportunities]]
- [[strategy/ironclad-core-plan]]
- [[runs/README]]
