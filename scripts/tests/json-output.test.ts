import test from 'node:test';
import assert from 'node:assert/strict';

import { toCompactJson } from '../lib/json-output.ts';

test('toCompactJson returns single-line compact JSON', () => {
  assert.equal(
    toCompactJson({
      screenType: 'event',
      topBar: { hp: '63/90', gold: 1 },
      choices: [{ action: 'proceed', label: 'Proceed' }],
    }),
    '{"screenType":"event","topBar":{"hp":"63/90","gold":1},"choices":[{"action":"proceed","label":"Proceed"}]}'
  );
});
