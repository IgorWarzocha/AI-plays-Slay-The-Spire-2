# STS2 Automation Notes

## Auto-Advance Candidates

- `main_menu.continue`
  - Safe deterministic action when an active run exists.
- `card_pile.close`
  - Safe deterministic action after a deliberate pile inspection.
- `event.choose:textkey:proceed`
  - Safe deterministic follow-up once an event reward/choice has already resolved.
- `rest_site.proceed`
  - Safe deterministic follow-up once the rest-site action has already resolved.
- `combat_card_select.confirm`
  - Safe deterministic follow-up once `Selection progress` reaches the exported minimum.

## Encounter Notes

### Phrog Parasite Elite

- Opening observed moves:
  - Turn 1: status setup (`StatusIntent "3"`), no direct damage.
  - Turn 2: `4x4` multi-attack.
- Death behavior:
  - `Infested` spawns four `Wriggler` enemies on kill.
- Spawned `Wriggler` board observed:
  - Initial HP values: `21`, `17`, `18`, `19`.
  - First post-spawn turn exported as `StunIntent`.
  - Later turn exported mixed actions:
    - some `SingleAttackIntent "6"`
    - some `BuffIntent` plus `StatusIntent "1"`
- Side effect:
  - `Infection` status cards are inserted into the draw cycle during the fight.

## Surface Notes

- `True Grit+` is not a separate overlay screen.
  - It enters combat hand-selection mode via `NPlayerHand`.
  - Exported as `screenType: "combat_card_select"`.
  - Required flow is:
    1. `combat.play:<true-grit>`
    2. `combat_card_select.select:<card>`
    3. `combat_card_select.confirm`
- Combat targeting across spawned multi-enemy boards is working.
  - Verified target ids for `Bash` and `Strike` update to `creature-2` through `creature-5` on the four-`Wriggler` board.
