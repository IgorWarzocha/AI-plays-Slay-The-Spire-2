export function toCompactJson(value: unknown): string {
  return JSON.stringify(value);
}

export function printJson(value: unknown): void {
  process.stdout.write(`${toCompactJson(value)}\n`);
}
