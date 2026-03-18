import test from 'node:test';
import assert from 'node:assert/strict';

import { assertPileInspectOptions } from '../lib/inspect-options.ts';

test('pile inspection allows default compact output and easy mode', () => {
  assert.doesNotThrow(() => assertPileInspectOptions({}));
  assert.doesNotThrow(() => assertPileInspectOptions({ easy: true }));
});

test('pile inspection rejects hard and full modes', () => {
  assert.throws(() => assertPileInspectOptions({ hard: true }), /Pile inspection only supports default compact output or --easy\./);
  assert.throws(() => assertPileInspectOptions({ full: true }), /Pile inspection only supports default compact output or --easy\./);
});
