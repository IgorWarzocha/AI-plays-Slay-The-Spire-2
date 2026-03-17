#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function run(command: string, args: readonly string[]): string {
  return execFileSync(command, [...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function findWindowId(): string {
  const output = run('xdotool', ['search', '--name', '^Slay the Spire 2$']).trim();
  const windowId = output.split(/\s+/).filter(Boolean)[0];

  if (!windowId) {
    throw new Error('Slay the Spire 2 window not found.');
  }

  return windowId;
}

function focusGame(): void {
  run('hyprctl', ['dispatch', 'focuswindow', 'class:^(Slay the Spire 2)$']);
  sleep(200);
}

function tapKey(windowId: string, key: string, holdMs = 25, settleMs = 90): void {
  run('xdotool', ['keydown', '--window', windowId, key]);
  sleep(holdMs);
  run('xdotool', ['keyup', '--window', windowId, key]);
  sleep(settleMs);
}

function sendRepeated(windowId: string, key: string, count: number, pause = 80): void {
  for (let index = 0; index < count; index += 1) {
    tapKey(windowId, key, 20, pause);
    sleep(pause);
  }
}

function resetToMainMenuTop(windowId: string): void {
  sendRepeated(windowId, 'Escape', 3, 120);
  sleep(250);
  sendRepeated(windowId, 'Up', 8, 60);
  sleep(200);
}

function discoverSteamProfilesRoot(): string {
  return path.join(os.homedir(), '.local', 'share', 'SlayTheSpire2', 'steam');
}

function hasContinueRun(): boolean {
  const steamRoot = discoverSteamProfilesRoot();
  if (!fs.existsSync(steamRoot)) {
    return false;
  }

  const candidates = fs
    .readdirSync(steamRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => [
      path.join(steamRoot, entry.name, 'profile1', 'saves', 'current_run.save'),
      path.join(steamRoot, entry.name, 'modded', 'profile1', 'saves', 'current_run.save'),
    ]);

  return candidates.some((candidate) => fs.existsSync(candidate));
}

function chooseMainMenuIndex(windowId: string, index: number, { accountForContinue = true }: { accountForContinue?: boolean } = {}): void {
  resetToMainMenuTop(windowId);
  const effectiveIndex = accountForContinue && hasContinueRun() ? index + 1 : index;

  if (effectiveIndex > 0) {
    sendRepeated(windowId, 'Down', effectiveIndex, 90);
    sleep(120);
  }

  tapKey(windowId, 'Return', 20, 160);
}

function main(): void {
  const [command = 'singleplayer', rawIndex] = process.argv.slice(2);
  const windowId = findWindowId();
  focusGame();

  switch (command) {
    case 'focus':
      return;
    case 'main-index': {
      const index = Number(rawIndex);
      if (!Number.isInteger(index) || index < 0) {
        throw new Error('main-index requires a non-negative integer.');
      }
      chooseMainMenuIndex(windowId, index, { accountForContinue: false });
      return;
    }
    case 'singleplayer':
      chooseMainMenuIndex(windowId, 0);
      return;
    case 'multiplayer':
      chooseMainMenuIndex(windowId, 1);
      return;
    case 'timeline':
      chooseMainMenuIndex(windowId, 2);
      return;
    case 'settings':
      chooseMainMenuIndex(windowId, 3);
      return;
    case 'compendium':
      chooseMainMenuIndex(windowId, 4);
      return;
    case 'quit':
      chooseMainMenuIndex(windowId, 5);
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
