export function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function waitFor(predicate, { timeoutMs = 45000, intervalMs = 200, description = "condition" } = {}) {
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
