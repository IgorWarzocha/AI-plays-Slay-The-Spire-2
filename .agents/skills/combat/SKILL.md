---
name: combat
description: Use this for combat turn planning and execution. Trigger it before taking combat turns, when deciding whether a turn is easy or hard, when a fight presents setup vs tempo tension, when cost changes or free-card effects appear, and whenever you need general combat heuristics that are not boss-or-elite specific.
---

# Combat

Use this as the default fight workflow for STS2 turns.

## Required Reading

Read these before acting:

- `/home/igorw/Work/STS2/.agents/skills/combat/references/heuristics.md`
- `/home/igorw/Work/STS2/.agents/skills/combat/references/mechanics.md`
- the current run log under `/home/igorw/Work/STS2/vault/runs`

If the run is Ironclad, also read:

- `/home/igorw/Work/STS2/.agents/skills/ironclad/SKILL.md`

If the fight is an elite or boss, also read:

- `/home/igorw/Work/STS2/.agents/skills/boss-and-elite-fights/SKILL.md`

## Workflow

1. Read the settled combat state only:
   - energy
   - hand
   - costs
   - intents
   - powers and debuffs
   - potions
   - relics and any end-of-turn or passive combat text that changes damage or block math
2. Classify the turn:
   - setup turn
   - survival turn
   - damage race
   - cleanup turn
3. Identify what matters most over the next cycle:
   - incoming damage
   - draw pile pollution
   - scaling
   - body count
   - breakpoints for lethal or a safer next shuffle
   - whether a drafted power is currently acting as a recurring dead draw and should instead be converted into live board text
   - whether card draw, hand size, or a cheap repeatable card is functioning as real survivability rather than optional value text
   - passive block or damage that will happen at end of turn from relics or powers
4. Commit the line that improves position, not just current-turn efficiency.
5. After any draw burst, cost mutation, free-card effect, or state-changing power:
   - stop
   - re-read with `--hard`
   - only then spend the rest of the turn

## View Modes: Easy Turn vs Hard Turn

- `--easy`: use this when the next decision is genuinely simple and the turn is mostly execution.
- `--hard`: use this when the turn is genuinely strategic, branching, dangerous, or information-dense.
- `--full`: raw debug dump. Use this only when the structured surfaces are insufficient or a surface/export bug is suspected.

Default posture:

- prefer `--easy` for obvious follow-through, cleanup turns, routine confirmation after safe plays, and any turn where the correct line is already known
- switch to `--hard` before meaningful planning, potion decisions, unusual mechanics, elites, bosses, or any uncertain lethal/survival math
- if an `--easy` read leads into new draw, generated cards, cost changes, a prompt, changed targeting, or any branch you did not already understand, stop and re-read with `--hard`
- switch to `--full` only for debugging or surface validation

The important distinction is not just combat vs non-combat, but **easy turn vs hard turn**. A combat turn can start easy and become hard mid-turn.

The inverse is also true: a turn in an elite or boss fight can start hard, become solved, and then become **easy execution**. Once the meaningful planning is done, stop rereading like it is still a hard turn.

## Thinking Mode vs Business-as-Usual

- Default to **thinking mode**: send one combat action at a time.
- Use **business-as-usual** when the rest of the line is truly stable and obvious.
- `--batch` is the opt-in for business-as-usual sequencing. It is allowed to include `combat.end_turn` as the tail action.

Important clarification:

- `--batch` is not a rare special case.
- If the whole turn is solved and nothing in the line can create new information, you SHOULD batch the whole turn.
- Do not keep single-stepping an already-solved turn just because the fight is labeled elite or boss.

Use `--batch` only when all of the following are true:

- no queued card will draw, discover, create, transform, exhaust-return, or otherwise change the hand
- no queued card or trigger will change costs, refunds, energy, or targeting rules mid-line
- no later queued action depends on a target that an earlier queued action might kill, split, remove, or otherwise invalidate
- no choice prompt, card select, potion use, or other interactive branch can appear before the batch finishes
- the post-play state is already understood well enough that you would make the same sequence if you sent the actions one by one

Examples:

- Safe enough: an obvious cleanup tail where target survival is already known and `combat.end_turn` is just closing the turn.
- Safe enough: after one `--hard` read in an elite, the rest of the turn is just executing a known line with no draw, no prompts, no cost changes, and no target uncertainty. Batch it.
- Safe enough: hallway or elite turns where you already know the exact kill order, the attacks are deterministic, and the last action is `combat.end_turn`.
- Not safe: anything involving draw, kill uncertainty, cost changes, new target exposure, generated cards, or on-kill / on-hit triggers you still need to inspect.

Practical rule:

- If you can say, before the first click, "I would make the exact same sequence if I sent these one by one," that is a strong sign the turn should be batched.
- If you need to see the result of card 1 before deciding card 2, do not batch.
- One hard read followed by one batch execution is often the right rhythm.

## Guardrails

- STS1 parallels are heuristics, not proof.
- Do not spend all energy just because it is available.
- Do not use `--batch` past temporary free cards, cost changes, draw effects, or uncertain kill math.
- Do not confuse "elite fight" with "every action must be single-stepped." The hard part is the planning boundary, not the room label.
- Do not do manual combat math as if cards were the whole board. Always include surfaced relic and power text that adds end-of-turn block, damage, or other passive combat value.
- Do not treat card draw as decorative upside. In many fights it is part of your real HP total because it preserves better defensive and offensive choices.
- Do not assume avoiding every small hit is correct. Some chip damage is worth taking if it preserves draw quality, hand size, or a materially stronger next-cycle position.
- Do not use potions just to smooth an average turn; use them when they change setup, survival, or lethal math.
- If combat state is not concretely exposed, stop and fix the surface before acting.

## Maintenance

Keep this skill short. Move durable lessons into the owned references, then refine this workflow when repeated combat mistakes or better patterns appear.
