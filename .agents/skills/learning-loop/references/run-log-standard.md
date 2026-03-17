# Run Log Standard

Use this note for live run logging and the end-of-run rewrite.

## One Run, One File

Keep one markdown file per run under `/home/igorw/Work/STS2/vault/runs`.

Rules:

- Create one file per run.
- Append while the run is live.
- Do not wait until the run ends.
- Quiet floors still get logged if they matter for continuity.
- The final file should read like a play review, not a technical trace.

## Live Floor Shape

For each meaningful floor note, record:

- floor number
- room type
- relevant starting state
- action or decision
- outcome
- lesson or hypothesis
- links to any reusable note that should be updated

Suggested floor template:

```markdown
### Floor <n>

- Room:
- State:
- Decision:
- Outcome:
- Lesson:
- Links:
```

## End-Of-Run Rewrite

Before the rewrite, reconcile final facts against `Compendium -> Run History` via:

- `npm run history`
- or `npm run history:status` if you need to inspect the current menu state first

Use `npm run history:raw` only when the full floor payload is needed.

The finished run file should include:

- run summary
- final deck
- final relics
- route summary
- key turning points
- post mortem
- links to important reusable notes

Suggested rewrite shape:

```markdown
## Run Summary
- Date:
- Character:
- Ascension:
- Seed:
- Result:
- Neow choice:
- Core plan:

## Final Deck
- Cards:
- Removes:
- Upgrades:

## Final Relics
- Relics:

## Route Summary
- Path taken:
- Why this route was chosen:

## Key Turning Points
- Fight, event, or shop 1:
- Fight, event, or shop 2:
- Fight, event, or shop 3:

## Post Mortem
- What went right:
- What went wrong:
- Real mistake in one phrase:
- What to change next run:
```

## Living Rule

The run log is for learning, not archival fluff. If a repeated pattern appears, promote it into the owning skill reference and then keep the run log compact.
