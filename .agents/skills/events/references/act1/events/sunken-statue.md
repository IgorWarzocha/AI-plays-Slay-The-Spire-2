# The Sunken Statue

Act 1 event note captured from a live Ironclad run.

## What It Is

- Event
- First observed act:
  - Overgrowth

## Observed Options

- `Dive into the Water`
  - Gain `111` gold
  - Lose `7` HP
- `Grab the Sword`
  - Obtain `Sword of Stone`

## Automation Notes

- Event export surfaced both options cleanly with stable text-key ids.
- This is a good reference event for verifying that event descriptions and reward strings stay readable without OCR.

## Play Notes

- `Dive into the Water` is the safer default when the deck is still weak and can convert immediate gold into near-term shop value.
- `Sword of Stone` is a long-horizon pick because it only transforms after defeating `5` elites.
- Without a strong reason to route aggressively through multiple elites, the immediate gold is easier to justify than betting on a delayed relic transformation.

## Learned From This Run

- Early shop reload behavior matters here because event value must be judged against actual spendable gold, not the save file's last persisted number.
- This event should be treated as a strategic branch, not filler flavor text, because the two options point toward opposite horizons: immediate tempo versus delayed scaling.

## Related

- [events skill](/home/igorw/Work/STS2/.agents/skills/events/SKILL.md)
- [ironclad-core-plan](/home/igorw/Work/STS2/.agents/skills/ironclad/references/strategy/ironclad-core-plan.md)
