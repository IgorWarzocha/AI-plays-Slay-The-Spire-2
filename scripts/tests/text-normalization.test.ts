import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeGameText } from '../lib/text-normalization.ts';
import { buildGameplayView } from '../lib/sts2-game-view.ts';

test('normalizeGameText strips markup and preserves energy semantics', () => {
  assert.equal(
    normalizeGameText('[center]Gain [blue]7[/blue] [gold]Block[/gold].[/center]'),
    'Gain 7 Block.',
  );

  assert.equal(
    normalizeGameText('Gain [img]res://images/packed/sprite_fonts/ironclad_energy_icon.png[/img][img]res://images/packed/sprite_fonts/ironclad_energy_icon.png[/img].'),
    'Gain 2 Energy.',
  );

  assert.equal(
    normalizeGameText('Gain [energy:3] at the start of each turn.'),
    'Gain 3 Energy at the start of each turn.',
  );
});

test('buildGameplayView normalizes event and combat note text in compact modes', () => {
  const view = buildGameplayView({
    screenType: 'event',
    updatedAtUtc: '2026-03-18T12:00:00.000Z',
    topBar: { currentHp: 50, maxHp: 80, gold: 99, buttons: [] },
    relics: [],
    potions: [],
    notes: ['Prompt: Choose a card to [gold]Remove[/gold].'],
    eventTitle: 'Orobas',
    eventDescription: '[sine][blue]Proceed[/blue][/sine] to the next room.',
  }, { hard: true });

  assert.equal(view.event?.description, 'Proceed to the next room.');
  assert.deepEqual(view.notes, ['Prompt: Choose a card to Remove.']);
});
