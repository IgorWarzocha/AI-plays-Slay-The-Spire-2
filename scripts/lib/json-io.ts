import fs from 'node:fs';

import { sleep } from './time.ts';

function isRetryableJsonReadError(error: unknown): error is SyntaxError | NodeJS.ErrnoException {
  return error instanceof SyntaxError || (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT');
}

export function readJson<T>(filePath: string, { retries = 8, delayMs = 25 }: { retries?: number; delayMs?: number } = {}): T {
  let lastError: SyntaxError | NodeJS.ErrnoException | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      if (!raw.trim()) {
        throw new SyntaxError(`JSON file '${filePath}' is empty.`);
      }

      return JSON.parse(raw) as T;
    } catch (error: unknown) {
      if (!isRetryableJsonReadError(error) || attempt === retries) {
        throw error;
      }

      lastError = error;
      sleep(delayMs);
    }
  }

  throw lastError ?? new Error(`Failed to read JSON from '${filePath}'.`);
}

export function readOptionalJson<T>(filePath: string): T | null {
  return fs.existsSync(filePath) ? readJson<T>(filePath) : null;
}

export function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
