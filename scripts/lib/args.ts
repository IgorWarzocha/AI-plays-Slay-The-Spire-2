import type { ParsedArgs } from './types.ts';

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const options: ParsedArgs['options'] = {};
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value == null) {
      continue;
    }

    if (!value.startsWith('--')) {
      positional.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { positional, options };
}
