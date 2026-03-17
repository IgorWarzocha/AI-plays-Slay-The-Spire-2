---
name: merchant
description: Use this when the current screen is a merchant or when planning a shop line from map pressure, gold, deck state, relics, and potions. Trigger it before buying, before leaving a shop, and when a forced elite or boss makes the shop an immediate survival checkpoint.
---

# Merchant

Use this as the shop decision workflow for STS2 runs.

## Required Reading

Read these before acting:

- `/home/igorw/Work/STS2/.agents/skills/merchant/references/heuristics.md`
- `/home/igorw/Work/STS2/.agents/skills/act-start/references/planning.md`
- `/home/igorw/Work/STS2/.agents/skills/act-start/references/rewards-and-deck-shape.md`
- the current run log under `/home/igorw/Work/STS2/vault/runs`

If the next node is an elite or boss, also read:

- `/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/SKILL.md`

## Workflow

1. Read the full merchant state:
   - gold
   - HP
   - deck snapshot
   - owned relics
   - potion slots, including empties
   - all merchant entries with real descriptions
2. Classify the shop before choosing anything:
   - damage-control shop
   - survival shop
   - forced-elite prep shop
   - boss-prep shop
   - value shop
3. Identify the run's current bottleneck:
   - weak opening hand
   - no block smoothing
   - no scaling
   - no AoE
   - bloated deck
   - empty potion slots before hard fights
4. Spend to solve the real bottleneck, not to maximize raw quantity.
5. After every buy, re-read the merchant state before the next buy if prices, inventory, or route pressure matter.
6. Before leaving, confirm:
   - gold spent matches the intended line
   - potion slots are used correctly
   - no better remove or potion line was skipped accidentally

## Priorities

- Forced hard fight next:
  - value relics that improve setup or consistency immediately
  - removes that sharpen the next shuffle
  - potions if slots are open
  - only buy cards that clearly improve the next fight
- Damage-control shop:
  - assume the route already made a mistake or imposed a tax
  - spend to survive the next few floors, not to preserve gold efficiency
  - fill potion slots aggressively
  - prefer consistency and bailout tools over greedy scaling
- Low-HP shop:
  - prioritize survival and consistency over speculative scaling
- Comfortable shop:
  - prefer one excellent purchase over multiple medium ones

## Guardrails

- Do not leave a shop with empty potion slots if the next hard fight can justify filling them.
- Do not buy filler just because gold is available.
- Do not assume a familiar STS1 card or relic is equally strong in STS2; read the live text.
- Respect skip-equivalents in shops too: holding gold can be correct.
- If merchant state or post-buy settlement looks inconsistent, stop and fix the exporter or command flow before continuing.

## Maintenance

Keep this skill short and practical. Move durable shopping heuristics into the owned references, then tighten this workflow when better shop patterns are discovered.
