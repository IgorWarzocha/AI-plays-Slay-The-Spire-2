# Note Promotion

Use this note to decide where durable lessons belong.

## Ownership Rule

The vault should stay minimal. Reusable knowledge belongs in skills.

Default owners:

- act-level planning, pathing, reward shape
  - `/home/igorw/Work/STS2/.agents/skills/act-start/references/`
- elites and bosses
  - `/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/references/`
- ordinary combat heuristics and combat mechanics
  - `/home/igorw/Work/STS2/.agents/skills/combat/references/`
- events
  - `/home/igorw/Work/STS2/.agents/skills/events/references/`
- Ironclad character heuristics
  - `/home/igorw/Work/STS2/.agents/skills/ironclad/references/`
- merchant logic
  - `/home/igorw/Work/STS2/.agents/skills/merchant/references/`
- logging standards and note ownership itself
  - `/home/igorw/Work/STS2/.agents/skills/learning-loop/references/`

## Promotion Standard

When a run reveals a durable lesson:

1. decide which skill owns it
2. merge it into the closest existing reference file
3. rewrite that file to keep it sharp
4. only create a new reference file if the existing one would become genuinely unwieldy

Prefer rewriting and merging over accreting tiny note shards.

## Note Shapes

### Encounter or event section

Use:

- what it is
- what we observed
- why it matters
- durable lesson or failure mode

### Mechanic or exporter section

Use:

- what the surface actually does
- why it matters for play
- why it matters for automation or control
- current rule or guardrail

### Strategy section

Use:

- core rule
- practical checks
- common failure mode
- durable lesson

## What Stays In The Vault

Only run logs should live in `/home/igorw/Work/STS2/vault/runs` by default.

If something feels like it needs a vault note, first ask whether one of the existing skills already owns it. Most of the time, it should be merged into skill references instead.

## Living Rule

These references are evolving working memory. Improve them by editing, compressing, and reconciling contradictions instead of letting them sprawl.
