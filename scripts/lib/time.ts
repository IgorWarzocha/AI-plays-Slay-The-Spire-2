export function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function waitFor<T>(
  predicate: () => T | null,
  { timeoutMs = 45_000, intervalMs = 200, description = 'condition' }: {
    timeoutMs?: number;
    intervalMs?: number;
    description?: string;
  } = {},
): T {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const value = predicate();
    if (value) {
      return value;
    }

    sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${description}.`);
}
