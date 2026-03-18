export function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export async function sleepAsync(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
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

export async function waitForAsync<T>(
  predicate: () => T | Promise<T | null> | null,
  { timeoutMs = 45_000, intervalMs = 200, description = 'condition' }: {
    timeoutMs?: number;
    intervalMs?: number;
    description?: string;
  } = {},
): Promise<T> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const value = await predicate();
    if (value) {
      return value;
    }

    await sleepAsync(intervalMs);
  }

  throw new Error(`Timed out waiting for ${description}.`);
}
