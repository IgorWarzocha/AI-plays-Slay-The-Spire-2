import fs from "node:fs";
import path from "node:path";
import { LOCAL_STS2_DIR } from "../config.mjs";
import { normalizeText, toCanonicalId } from "../model/ids.mjs";
import { ReferenceSource } from "./base.mjs";

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findNewest(paths) {
  const matches = paths
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return matches[0]?.filePath ?? null;
}

function readAgentScreenState() {
  const filePath = path.join(LOCAL_STS2_DIR, "agent_state", "screen_state.json");
  return readJsonIfPresent(filePath);
}

function findSteamIds() {
  const steamRoot = path.join(LOCAL_STS2_DIR, "steam");
  if (!fs.existsSync(steamRoot)) {
    return [];
  }

  return fs.readdirSync(steamRoot).filter((entry) => /^\d+$/.test(entry));
}

function candidatePathsFor(relativePath) {
  const steamIds = findSteamIds();
  return steamIds.flatMap((steamId) => [
    path.join(LOCAL_STS2_DIR, "steam", steamId, "modded", "profile1", "saves", relativePath),
    path.join(LOCAL_STS2_DIR, "steam", steamId, "profile1", "saves", relativePath),
  ]);
}

function incrementCounter(map, rawId) {
  const id = toCanonicalId(rawId);
  if (!id) {
    return;
  }

  map[id] = (map[id] ?? 0) + 1;
}

export class LocalSaveAugmentSource extends ReferenceSource {
  constructor() {
    super("local-save-augment", "augment");
  }

  async load() {
    const progressPath = findNewest(candidatePathsFor("progress.save"));
    const currentRunPath = findNewest(candidatePathsFor("current_run.save"));

    const progress = progressPath ? readJsonIfPresent(progressPath) : null;
    const currentRun = currentRunPath ? readJsonIfPresent(currentRunPath) : null;

    const augmentation = {
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

    const currentNodeId = currentRun?.acts?.[currentRun?.current_act_index]?.map?.current_room?.room_id
      ?? currentRun?.pre_finished_room?.room_id
      ?? currentRun?.acts?.[currentRun?.current_act_index]?.current_room?.room_id
      ?? null;

    augmentation.currentRun.currentEventId = toCanonicalId(currentNodeId);
    const screenState = readAgentScreenState();
    augmentation.currentRun.currentEventTitle = normalizeText(screenState?.screenType === "event" ? screenState.eventTitle : null);
    return augmentation;
  }
}
