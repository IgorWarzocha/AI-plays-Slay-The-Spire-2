import type { RuntimeCommandOptions } from './types.ts';

export function assertPileInspectOptions(options: RuntimeCommandOptions): void {
  if (options.hard || options.full) {
    throw new Error('Pile inspection only supports default compact output or --easy.');
  }
}
