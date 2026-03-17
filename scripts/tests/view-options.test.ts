import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveViewMode, resolveViewPreferences } from '../lib/view-options.ts';

test('resolveViewMode defaults to easy and promotes legacy detail flags to hard', () => {
  assert.equal(resolveViewMode({}), 'easy');
  assert.equal(resolveViewMode({ notes: true }), 'hard');
  assert.equal(resolveViewMode({ menu: true }), 'hard');
  assert.equal(resolveViewMode({ full: true }), 'full');
  assert.equal(resolveViewMode({ raw: true }), 'full');
});

test('resolveViewMode rejects conflicting mode flags', () => {
  assert.throws(() => resolveViewMode({ easy: true, hard: true }), /Choose only one view mode/);
  assert.throws(() => resolveViewMode({ hard: true, full: true }), /Choose only one view mode/);
});

test('resolveViewPreferences exposes compact easy defaults and rich hard defaults', () => {
  assert.deepEqual(resolveViewPreferences({ easy: true }), {
    mode: 'easy',
    includeActions: false,
    includeMenuItems: false,
    includeNotes: false,
    includeRelicDetails: false,
    compactCombat: true,
    compactCollections: true,
    occupiedPotionsOnly: true,
  });

  assert.deepEqual(resolveViewPreferences({ hard: true }), {
    mode: 'hard',
    includeActions: true,
    includeMenuItems: true,
    includeNotes: true,
    includeRelicDetails: true,
    compactCombat: false,
    compactCollections: false,
    occupiedPotionsOnly: false,
  });
});
