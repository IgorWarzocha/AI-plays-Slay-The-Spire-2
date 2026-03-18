import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { ActState, DisplayState } from './types.ts';
import type { SaveAct, SaveRun } from './run-save-summary-types.ts';

interface CachedActContext {
  savePath: string;
  mtimeMs: number;
  act: ActState | null;
}

let cachedActContext: CachedActContext | null = null;

function stripPrefix(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const index = value.lastIndexOf('.');
  return index === -1 ? value : value.slice(index + 1);
}

function discoverLatestSavePath(): string | null {
  const steamRoot = path.join(os.homedir(), '.local', 'share', 'SlayTheSpire2', 'steam');
  if (!fs.existsSync(steamRoot)) {
    return null;
  }

  const candidates = fs
    .readdirSync(steamRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => [
      path.join(steamRoot, entry.name, 'modded', 'profile1', 'saves', 'current_run.save'),
      path.join(steamRoot, entry.name, 'profile1', 'saves', 'current_run.save'),
    ])
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => ({
      path: candidate,
      mtimeMs: fs.statSync(candidate).mtimeMs,
    }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.path ?? null;
}

function buildActContext(run: SaveRun): ActState | null {
  const actIndex = Number.isInteger(run.current_act_index) ? run.current_act_index : 0;
  const act: SaveAct | null = Array.isArray(run.acts) ? (run.acts[actIndex] ?? null) : null;
  if (!act) {
    return null;
  }

  return {
    index: actIndex,
    number: actIndex + 1,
    id: act.id ?? null,
    shortId: stripPrefix(act.id),
    ancientId: act.rooms?.ancient_id ?? null,
    bossId: act.rooms?.boss_id ?? null,
    bossShortId: stripPrefix(act.rooms?.boss_id),
  };
}

function readActContext(): ActState | null {
  try {
    const savePath = discoverLatestSavePath();
    if (!savePath) {
      return null;
    }

    const mtimeMs = fs.statSync(savePath).mtimeMs;
    if (cachedActContext && cachedActContext.savePath === savePath && cachedActContext.mtimeMs === mtimeMs) {
      return cachedActContext.act;
    }

    const run = JSON.parse(fs.readFileSync(savePath, 'utf8')) as SaveRun;
    const act = buildActContext(run);
    cachedActContext = { savePath, mtimeMs, act };
    return act;
  } catch {
    return null;
  }
}

export function withDisplayStateRunContext(state: DisplayState | null | undefined): DisplayState | null {
  if (!state) {
    return state ?? null;
  }

  const act = readActContext();
  if (!act) {
    return state;
  }

  const boss = act.bossShortId ?? act.bossId ?? null;
  const nextMap = state.map == null ? state.map : { ...state.map, boss };

  const alreadyAnnotated = (state.act?.shortId ?? state.act?.id ?? null) === (act.shortId ?? act.id ?? null)
    && (state.act?.bossShortId ?? state.act?.bossId ?? null) === boss
    && (state.map?.boss ?? null) === boss;
  if (alreadyAnnotated) {
    return state;
  }

  return {
    ...state,
    act,
    ...(nextMap !== undefined ? { map: nextMap } : {}),
  };
}
