import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildCliPayload, renderCliOutput } from '../lib/cli-output.ts';

test('buildCliPayload prunes null and empty values and strips updatedAtUtc outside full mode', () => {
  const payload = buildCliPayload({
    screenType: 'map_screen',
    updatedAtUtc: '2026-03-18T12:00:00.000Z',
    zero: 0,
    enabled: false,
    notes: [],
    menuItems: [
      {
        id: 'a',
        description: null,
        enabled: false,
      },
    ],
    nested: {
      empty: '',
      keep: 'x',
      emptyArray: [],
      emptyObject: {},
    },
  }, { easy: true });

  assert.deepEqual(payload, {
    screenType: 'map_screen',
    zero: 0,
    enabled: false,
    menuItems: [{ id: 'a', enabled: false }],
    nested: { keep: 'x' },
  });
});

test('buildCliPayload keeps full mode lossless', () => {
  const payload = buildCliPayload({
    screenType: 'map_screen',
    updatedAtUtc: '2026-03-18T12:00:00.000Z',
    notes: [],
  }, { full: true });

  assert.deepEqual(payload, {
    screenType: 'map_screen',
    updatedAtUtc: '2026-03-18T12:00:00.000Z',
    notes: [],
  });
});

test('renderCliOutput suppresses unchanged compact output by cache key', () => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sts2-cli-output-test-'));
  const cachePath = path.join(cacheDir, 'cache.json');

  try {
    const first = renderCliOutput({ screenType: 'map_screen', updatedAtUtc: '1', notes: [] }, {
      options: { easy: true },
      cacheKey: 'status:easy',
      cachePath,
    });
    assert.equal(first.suppressed, false);
    assert.equal(first.text, '{"screenType":"map_screen"}');

    const second = renderCliOutput({ screenType: 'map_screen', updatedAtUtc: '2', notes: [] }, {
      options: { easy: true },
      cacheKey: 'status:easy',
      cachePath,
    });
    assert.equal(second.suppressed, true);
    assert.equal(second.text, '');

    const third = renderCliOutput({ screenType: 'event', updatedAtUtc: '3' }, {
      options: { easy: true },
      cacheKey: 'status:easy',
      cachePath,
    });
    assert.equal(third.suppressed, false);
    assert.equal(third.text, '{"screenType":"event"}');
  } finally {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  }
});

test('renderCliOutput does not suppress full mode output', () => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sts2-cli-output-test-'));
  const cachePath = path.join(cacheDir, 'cache.json');

  try {
    const first = renderCliOutput({ screenType: 'map_screen', updatedAtUtc: '1' }, {
      options: { full: true },
      cacheKey: 'status:full',
      cachePath,
    });
    const second = renderCliOutput({ screenType: 'map_screen', updatedAtUtc: '1' }, {
      options: { full: true },
      cacheKey: 'status:full',
      cachePath,
    });

    assert.equal(first.suppressed, false);
    assert.equal(second.suppressed, false);
    assert.equal(second.text, '{"screenType":"map_screen","updatedAtUtc":"1"}');
  } finally {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  }
});
