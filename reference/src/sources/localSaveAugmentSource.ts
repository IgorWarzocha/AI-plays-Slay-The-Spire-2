import fs from 'node:fs';
import path from 'node:path';

import type { BootstrapRawEntity, ReferenceAugmentation } from '../types.ts';
import { LOCAL_STS2_DIR } from '../config.ts';
import { normalizeText, toCanonicalId } from '../model/ids.ts';
import { ReferenceSource } from './base.ts';

function readJsonIfPresent<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function findNewest(paths: readonly string[]): string | null {
  const matches = paths
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return matches[0]?.filePath ?? null;
}

function readAgentScreenState(): { screenType?: string; eventTitle?: string | null } | null {
  const filePath = path.join(LOCAL_STS2_DIR, 'agent_state', 'screen_state.json');
  return readJsonIfPresent(filePath);
}

function findSteamIds(): string[] {
  const steamRoot = path.join(LOCAL_STS2_DIR, 'steam');
  if (!fs.existsSync(steamRoot)) {
    return [];
  }

  return fs.readdirSync(steamRoot).filter((entry) => /^\d+$/.test(entry));
}

function candidatePathsFor(relativePath: string): string[] {
  const steamIds = findSteamIds();
  return steamIds.flatMap((steamId) => [
    path.join(LOCAL_STS2_DIR, 'steam', steamId, 'modded', 'profile1', 'saves', relativePath),
    path.join(LOCAL_STS2_DIR, 'steam', steamId, 'profile1', 'saves', relativePath),
  ]);
}

function incrementCounter(map: Record<string, number>, rawId: unknown): void {
  const id = toCanonicalId(rawId);
  if (!id) {
    return;
  }

  map[id] = (map[id] ?? 0) + 1;
}

interface ProgressSave {
  discovered_cards?: unknown[];
  discovered_relics?: unknown[];
  discovered_events?: unknown[];
}

interface CurrentRunSave {
  players?: Array<{
    deck?: Array<{ id?: unknown }>;
    relics?: Array<{ id?: unknown }>;
  }>;
  current_act_index?: number;
  acts?: Array<{
    map?: {
      current_room?: { room_id?: unknown };
    };
    current_room?: { room_id?: unknown };
  }>;
  pre_finished_room?: { room_id?: unknown };
}

export class LocalSaveAugmentSource extends ReferenceSource<ReferenceAugmentation> {
  constructor() {
    super('local-save-augment', 'augment');
  }

  async load(): Promise<ReferenceAugmentation> {
    const progressPath = findNewest(candidatePathsFor('progress.save'));
    const currentRunPath = findNewest(candidatePathsFor('current_run.save'));

    const progress = progressPath ? readJsonIfPresent<ProgressSave>(progressPath) : null;
    const currentRun = currentRunPath ? readJsonIfPresent<CurrentRunSave>(currentRunPath) : null;

    const augmentation: ReferenceAugmentation = {
      discovered: {
        cards: new Set((progress?.discovered_cards ?? []).map(toCanonicalId)),
        relics: new Set((progress?.discovered_relics ?? []).map(toCanonicalId)),
        events: new Set((progress?.discovered_events ?? []).map(toCanonicalId)),
      },
      currentRun: {
        cards: {},
        relics: {},
        currentEventId: null,
        currentEventTitle: null,
      },
      paths: {
        progressPath,
        currentRunPath,
      },
    };

    for (const card of currentRun?.players?.[0]?.deck ?? []) {
      incrementCounter(augmentation.currentRun.cards, card.id);
    }

    for (const relic of currentRun?.players?.[0]?.relics ?? []) {
      incrementCounter(augmentation.currentRun.relics, relic.id);
    }

    const currentAct = currentRun?.acts?.[currentRun?.current_act_index ?? 0];
    const currentNodeId = currentAct?.map?.current_room?.room_id
      ?? currentRun?.pre_finished_room?.room_id
      ?? currentAct?.current_room?.room_id
      ?? null;

    augmentation.currentRun.currentEventId = toCanonicalId(currentNodeId) || null;
    const screenState = readAgentScreenState();
    augmentation.currentRun.currentEventTitle = normalizeText(
      screenState?.screenType === 'event' ? screenState.eventTitle : null,
    ) || null;
    return augmentation;
  }
}
