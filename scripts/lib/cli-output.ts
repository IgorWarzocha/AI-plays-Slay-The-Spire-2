import fs from 'node:fs';
import path from 'node:path';

import { STS2_RUNTIME_PATHS } from './runtime-paths.ts';
import type { RuntimeCommandOptions } from './types.ts';
import { resolveViewMode } from './view-options.ts';

interface CliOutputCache {
  entries: Record<string, string>;
}

export interface RenderCliOutputOptions {
  options?: RuntimeCommandOptions;
  cacheKey?: string;
  cachePath?: string;
}

export interface RenderCliOutputResult {
  text: string;
  suppressed: boolean;
}

function readCliOutputCache(cachePath: string): CliOutputCache {
  try {
    const raw = fs.readFileSync(cachePath, 'utf8').trim();
    if (!raw) {
      return { entries: {} };
    }

    const parsed = JSON.parse(raw) as Partial<CliOutputCache>;
    return {
      entries: parsed.entries && typeof parsed.entries === 'object' ? parsed.entries as Record<string, string> : {},
    };
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return { entries: {} };
    }

    return { entries: {} };
  }
}

function writeCliOutputCache(cachePath: string, cache: CliOutputCache): void {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify(cache)}\n`, 'utf8');
}

function pruneCliValue(value: unknown, { stripUpdatedAtUtc }: { stripUpdatedAtUtc: boolean }): unknown {
  if (value == null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.length === 0 ? undefined : value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((entry) => pruneCliValue(entry, { stripUpdatedAtUtc }))
      .filter((entry) => entry !== undefined);
    return items.length > 0 ? items : undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const next: Record<string, unknown> = {};

  for (const [key, entry] of entries) {
    if (stripUpdatedAtUtc && key === 'updatedAtUtc') {
      continue;
    }

    const pruned = pruneCliValue(entry, { stripUpdatedAtUtc });
    if (pruned === undefined) {
      continue;
    }

    next[key] = pruned;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.keys(value as Record<string, unknown>)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
      return result;
    }, {});
}

export function buildCliPayload(value: unknown, options: RuntimeCommandOptions = {}): unknown {
  const mode = resolveViewMode(options);
  if (mode === 'full') {
    return value ?? null;
  }

  return pruneCliValue(value, { stripUpdatedAtUtc: true }) ?? null;
}

export function buildCliSemanticKey(value: unknown, options: RuntimeCommandOptions = {}): string {
  return JSON.stringify(sortKeysDeep(buildCliPayload(value, options)));
}

export function buildStatusCacheKey(baseKey: string, options: RuntimeCommandOptions = {}): string {
  return `${baseKey}:${resolveViewMode(options)}`;
}

export function renderCliOutput(value: unknown, {
  options = {},
  cacheKey,
  cachePath = STS2_RUNTIME_PATHS.cliOutputCachePath,
}: RenderCliOutputOptions = {}): RenderCliOutputResult {
  const payload = buildCliPayload(value, options);
  const mode = resolveViewMode(options);

  if (mode !== 'full' && cacheKey) {
    const semanticKey = buildCliSemanticKey(value, options);
    const cache = readCliOutputCache(cachePath);
    if (cache.entries[cacheKey] === semanticKey) {
      return {
        text: '',
        suppressed: true,
      };
    }

    cache.entries[cacheKey] = semanticKey;
    writeCliOutputCache(cachePath, cache);
  }

  return {
    text: JSON.stringify(payload ?? null),
    suppressed: false,
  };
}

export function printCliOutput(value: unknown, options: RenderCliOutputOptions = {}): void {
  const result = renderCliOutput(value, options);
  if (!result.text) {
    return;
  }

  process.stdout.write(`${result.text}\n`);
}
