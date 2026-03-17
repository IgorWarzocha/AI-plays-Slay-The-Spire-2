# Tinker Time

## What It Tests

- Whether a generated-card event is being judged in isolation or against the current run state.
- Whether relic context is being considered before defaulting to the strongest-looking standalone text.

## Durable Lesson

- Do not pick the flashiest generated card frame first.
- Rebuild the run context:
  - current relics
  - deck shape
  - potion slack
  - next-route pressure
- In this run, `Mummified Hand` made the `Gadget` branch materially stronger than the raw `Weapon` preview suggested.

## Practical Rule

- If an event creates a card, compare the branches against the relic stack already in play.
- If the event text is not concrete, fix the exporter before choosing.

## Current Best Example

- `Weapon`: looked clean because it exposed `Deal 12 damage. ???`
- `Gadget`: became the better line once the relic context was considered
- `Curious` was correct here because a generated power plus `Mummified Hand` improved the deck's real combat engine, not just one card slot
