import type { GameWindow } from './types.ts';
import { run } from './shell.ts';
import { STS2_RUNTIME_PATHS } from './runtime-paths.ts';

export function getWindow(): GameWindow | null {
  const output = run('hyprctl', ['clients', '-j'], { allowFailure: true });
  if (!output) {
    return null;
  }

  const clients = JSON.parse(output) as GameWindow[];
  return clients.find(
    (client) => client.class === STS2_RUNTIME_PATHS.gameClass || client.title === STS2_RUNTIME_PATHS.gameClass,
  ) ?? null;
}

export function isRunning(): boolean {
  return Boolean(getWindow());
}
