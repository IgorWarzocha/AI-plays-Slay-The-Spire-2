# TODO

## Enemy Intent Fidelity

Goal: expose enemy intent at GUI-equivalent fidelity, so the agent sees the same broad combat information a human player would see in-game.

Current state:
- We can usually see the intent category well enough to know whether an enemy is attacking, buffing, debuffing, or adding status cards.
- We can usually see visible attack numbers.
- We cannot yet always see the exact semantic move in a player-meaningful way.
- We do not yet always expose the concrete payload behind generic-looking intents.

What "done" looks like:
- For every enemy on screen, the surfaced state clearly tells us:
  - the actual move being performed, if the game knows it
  - damage pattern
  - hit count
  - buff payload
  - debuff payload
  - status card payload
  - any special rule that changes how the move should be interpreted
- The surfaced intent should be understandable without requiring debug flags, raw runtime inspection, or screenshots.
- The surfaced intent should read like gameplay information, not internal engine data.

Examples of the gap:
- "Attack 16" is not enough if the real player-facing meaning is closer to "Nemesis-style burn/status turn".
- "Debuff" is not enough if the actual effect is something like `Vulnerable`, `Weak`, `Frail`, or a unique STS2 mechanic.
- "Status" is not enough if the actual card being shuffled or created matters for the turn plan.

Approach:
1. Keep extracting concrete intent data from runtime state wherever the game already knows it.
2. When the runtime signal is unclear, validate against the live GUI and write down what was missing.
3. Build enemy-by-enemy understanding in the vault, especially for elites and bosses.
4. Prefer player-language summaries over raw engine names.
5. Treat this as a shared interpretation problem, not just a code problem.

Working rule:
- If a fight presents information a human player can clearly read from the GUI, but the surfaced state cannot express it, that is a missing feature and should be fixed or documented immediately.

Short-term follow-ups:
- Audit current combat export for exact move names and payload-bearing fields.
- Add a normalized intent shape that separates:
  - move identity
  - attack math
  - status payload
  - debuff payload
  - buff payload
  - special flags
- Add vault notes for enemies where the intent pattern matters strategically.
- Cross-reference STS1 parallels when they are helpful heuristics.

## Enemy Intent Progress

Sorted:
- `BuffIntent` -> broad GUI-equivalent "enemy buffs this turn"
- `DefendIntent` -> broad GUI-equivalent "enemy gains block this turn"
- `SingleAttackIntent` with visible number -> broad GUI-equivalent single hit
- `StunIntent` -> broad GUI-equivalent stun / non-standard inactive turn

Still missing:
- exact payload behind `StatusIntent`
- exact payload behind `DebuffIntent`
- better summaries for mixed turns like attack-plus-debuff or buff-plus-defend
