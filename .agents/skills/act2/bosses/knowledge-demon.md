# Knowledge Demon

## What It Is

- Act 2 boss
- Closest useful STS1 mental model:
  - not a clean 1:1 match; the best approximation is an opening Hexaghost-style tax choice followed by a Champ/Book-style pressure cycle where missed setup windows are expensive

## Current Read

- The opening debuff choice matters immediately. The observed options were:
  - `Disintegration`: "At the end of your turn, take 6 damage."
  - `Mind Rot`: "Draw 1 fewer card each turn."
- After that opener, the boss did not behave like a pure race. It mixed:
  - a `17` single attack
  - an `8x3` multi-attack
  - an `11` attack combined with `Heal` and `Buff`
  - then another debuff-choice turn
- That means the fight keeps asking for both damage conversion and real setup.
- The tax choice is not just "HP vs cards" in the abstract. It has to be judged through the current deck:
  - if draw is mostly energy-paid, a draw debuff can become an energy debuff too
  - if the deck gets defensive value from ending with extra cards in hand, shrinking hand size is hidden HP loss
  - if the deck needs cheap repeated attacks to keep pressure up, permanent HP tax can make every stabilization turn worse
- The key correction from the failed attempts is broader than this boss: real setup cards and real card flow are both board state. Skipping them or casually cashing them in for tiny immediate damage gains can lose the whole long fight.

## Practical Rule

- Treat the opening debuff turn as a real planning turn, not free space.
- Treat card draw and hand size as part of survival math, not as luxury text. In this fight, losing a card every turn can be as lethal as visible damage if the deck relies on options, retention, or energy-paid draw to stay stable.
- On the heal-and-buff turn, pressure matters more than cosmetic efficiency; that is often the cleanest window to cash in scaling or payoff text.
- Multi-attack turns still require honest block math even when the last turn looked safe.
- If the deck drafted powers for scaling or draw conversion, assume this boss expects them to be cast unless survival math concretely forbids it.
- Do not casually exhaust or throw away cheap repeatable output in the early cycle. This fight often goes long enough that losing a good one-energy attack or other low-cost conversion piece can make later taxed turns collapse.

## Failure Mode To Avoid

- spending the opener only on raw attack cards while leaving drafted powers stranded in the deck
- treating the heal-and-buff turn like a normal attack turn and missing the setup window it provides
- choosing a debuff at the opener without asking which tax the current deck can actually carry through a long fight
- drifting through the cycle one medium turn at a time and letting the boss keep both scaling and recoveries
- forgetting that payoff relics, powers, or debuff synergies can themselves create live mid-turn state changes; once a card application also draws, refunds, or changes block math, the turn must be re-read before committing the rest of the line
- treating draw loss as a softer tax than it really is when the deck needs hand size, cheap sequencing, or energy-paid draw to function
- exhausting one of the deck's better cheap attacks too early and then discovering that the later taxed turns no longer have enough clean pressure

## Durable Lesson

- `Knowledge Demon` punishes fake bookkeeping. Card draw, hand size, cheap repeatable output, and real setup all belong in survival math here.

## Source

- `2026-03-17-ironclad-run-004`
