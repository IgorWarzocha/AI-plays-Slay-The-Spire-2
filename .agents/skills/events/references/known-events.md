# Known Events

Use this note for durable reads on events that have already taught something reusable.

## Sunken Statue

### What It Is

- Event
- First observed act:
  - Overgrowth

### Observed Options

- `Dive into the Water`
  - Gain `111` gold
  - Lose `7` HP
- `Grab the Sword`
  - Obtain `Sword of Stone`

### Automation Notes

- Event export surfaced both options cleanly with stable text-key ids.
- This is a good reference event for verifying that event descriptions and reward strings stay readable without OCR.

### Play Notes

- `Dive into the Water` is the safer default when the deck is still weak and can convert immediate gold into near-term shop value.
- `Sword of Stone` is a long-horizon pick because it only transforms after defeating `5` elites.
- Without a strong reason to route aggressively through multiple elites, the immediate gold is easier to justify than betting on a delayed relic transformation.

### Durable Lesson

Early shop reload behavior matters here because event value must be judged against actual spendable gold, not the save file's last persisted number.

## Tinker Time

### What It Tests

- Whether a generated-card event is being judged in isolation or against the current run state.
- Whether relic context is being considered before defaulting to the strongest-looking standalone text.

### Durable Lesson

- Do not pick the flashiest generated card frame first.
- Rebuild the run context:
  - current relics
  - deck shape
  - potion slack
  - next-route pressure
- In this run, `Mummified Hand` made the `Gadget` branch materially stronger than the raw `Weapon` preview suggested.

### Practical Rule

- If an event creates a card, compare the branches against the relic stack already in play.
- If the event text is not concrete, fix the exporter before choosing.

### Current Best Example

- `Weapon`: looked clean because it exposed `Deal 12 damage. ???`
- `Gadget`: became the better line once the relic context was considered
- `Curious` was correct here because a generated power plus `Mummified Hand` improved the deck's real combat engine, not just one card slot

## Living Rule

This note should stay compact. Keep only event reads that teach something reusable beyond a single run.
