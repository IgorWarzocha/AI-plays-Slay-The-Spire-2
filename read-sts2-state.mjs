#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptionalJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return readJson(filePath);
}

function formatUnixSeconds(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function stripPrefix(value) {
  if (typeof value !== "string") {
    return value;
  }

  const index = value.lastIndexOf(".");
  return index === -1 ? value : value.slice(index + 1);
}

function discoverSavePath(explicitPath) {
  if (explicitPath) {
    return explicitPath;
  }

  const steamRoot = path.join(
    os.homedir(),
    ".local",
    "share",
    "SlayTheSpire2",
    "steam",
  );

  if (!fs.existsSync(steamRoot)) {
    fail(`STS2 steam save root not found: ${steamRoot}`);
  }

  const candidates = fs
    .readdirSync(steamRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => [
      path.join(steamRoot, entry.name, "modded", "profile1", "saves", "current_run.save"),
      path.join(steamRoot, entry.name, "profile1", "saves", "current_run.save"),
    ])
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => ({
      path: candidate,
      mtimeMs: fs.statSync(candidate).mtimeMs,
    }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  if (candidates.length === 0) {
    fail(`No current_run.save found under ${steamRoot}`);
  }

  return candidates[0].path;
}

function discoverScreenStatePath() {
  return path.join(
    os.homedir(),
    ".local",
    "share",
    "SlayTheSpire2",
    "agent_state",
    "screen_state.json",
  );
}

function coordKey(coord) {
  return `${coord.col},${coord.row}`;
}

function simplifyNode(node) {
  if (!node) {
    return null;
  }

  return {
    coord: node.coord,
    type: node.type,
    canModify: node.can_modify ?? null,
    nextCoords: Array.isArray(node.children) ? node.children : [],
  };
}

function buildPointIndex(points) {
  const index = new Map();
  for (const point of points) {
    index.set(coordKey(point.coord), point);
  }
  return index;
}

function summarizeRun(run, savePath, screenState) {
  const actIndex = run.current_act_index;
  const act = run.acts?.[actIndex];
  const player = run.players?.[0];

  if (!act) {
    fail(`No act found at current_act_index=${actIndex}`);
  }

  if (!player) {
    fail("No player state found in current_run.save");
  }

  const savedMap = act.saved_map;
  const points = savedMap?.points ?? [];
  const pointIndex = buildPointIndex(points);
  const visited = Array.isArray(run.visited_map_coords) ? run.visited_map_coords : [];
  const lastVisitedCoord = visited.at(-1) ?? savedMap?.start?.coord ?? null;
  const currentNode =
    lastVisitedCoord && savedMap?.start && coordKey(lastVisitedCoord) === coordKey(savedMap.start.coord)
      ? savedMap.start
      : lastVisitedCoord
        ? pointIndex.get(coordKey(lastVisitedCoord)) ?? null
        : null;

  const nextNodes = (currentNode?.children ?? [])
    .map((coord) => pointIndex.get(coordKey(coord)))
    .filter(Boolean)
    .map(simplifyNode);

  const deck = Array.isArray(player.deck)
    ? player.deck.map((card) => ({
        id: card.id,
        shortId: stripPrefix(card.id),
        upgraded: Boolean(card.upgraded),
      }))
    : [];

  const relics = Array.isArray(player.relics)
    ? player.relics.map((relic) => ({
        id: relic.id,
        shortId: stripPrefix(relic.id),
      }))
    : [];

  return {
    savePath,
    screenStatePath: screenState?._path ?? null,
    saveTimeUnix: run.save_time,
    saveTimeIso: formatUnixSeconds(run.save_time),
    startTimeUnix: run.start_time,
    startTimeIso: formatUnixSeconds(run.start_time),
    runTimeSeconds: run.run_time ?? null,
    ascension: run.ascension ?? null,
    act: {
      index: actIndex,
      number: actIndex + 1,
      id: act.id,
      shortId: stripPrefix(act.id),
      ancientId: act.rooms?.ancient_id ?? null,
      bossId: act.rooms?.boss_id ?? null,
    },
    position: {
      visitedCount: visited.length,
      visitedCoords: visited,
      currentNode: simplifyNode(currentNode),
      nextNodes,
    },
    player: {
      characterId: player.character_id,
      characterShortId: stripPrefix(player.character_id),
      currentHp: player.current_hp,
      maxHp: player.max_hp,
      gold: player.gold,
      maxEnergy: player.max_energy,
      relics,
      deckCount: deck.length,
      deck,
    },
    flags: {
      startedWithNeow: Boolean(run.extra_fields?.started_with_neow),
      preFinishedRoom: run.pre_finished_room ?? null,
      won: Boolean(run.win_time),
    },
    screen: screenState
      ? {
          source: screenState.source ?? null,
          updatedAtUtc: screenState.updatedAtUtc ?? null,
          screenType: screenState.screenType ?? null,
          eventTitle: screenState.eventTitle ?? null,
          eventDescription: screenState.eventDescription ?? null,
          actions: Array.isArray(screenState.actions) ? screenState.actions : [],
          menuItems: Array.isArray(screenState.menuItems)
            ? screenState.menuItems.map((item) => ({
                id: item.id ?? null,
                label: item.label ?? null,
                visible: Boolean(item.visible),
                enabled: Boolean(item.enabled),
                selected: Boolean(item.selected),
              }))
            : [],
          characters: Array.isArray(screenState.characters) ? screenState.characters : [],
          characterSelection: screenState.characterSelection ?? null,
        }
      : null,
  };
}

function printText(summary) {
  const currentNode = summary.position.currentNode;
  const nextNodes = summary.position.nextNodes;

  console.log(`Save: ${summary.savePath}`);
  console.log(`Saved: ${summary.saveTimeIso ?? "unknown"}`);
  console.log(
    `Run: ${summary.player.characterShortId} A${summary.ascension} in ${summary.act.shortId}`,
  );
  console.log(
    `Vitals: HP ${summary.player.currentHp}/${summary.player.maxHp}, Gold ${summary.player.gold}, Energy ${summary.player.maxEnergy}`,
  );
  console.log(
    `Relics: ${summary.player.relics.map((relic) => relic.shortId).join(", ") || "(none)"}`,
  );
  console.log(`Deck: ${summary.player.deckCount} cards`);
  console.log(
    `Current node: ${
      currentNode
        ? `${currentNode.type} @ (${currentNode.coord.col},${currentNode.coord.row})`
        : "unknown"
    }`,
  );

  if (nextNodes.length > 0) {
    console.log(
      `Next nodes: ${nextNodes
        .map((node) => `${node.type} @ (${node.coord.col},${node.coord.row})`)
        .join(" | ")}`,
    );
  } else {
    console.log("Next nodes: none");
  }

  if (summary.screen) {
    console.log(
      `Screen: ${summary.screen.screenType ?? "unknown"}${
        summary.screen.actions.length > 0 ? ` [${summary.screen.actions.join(", ")}]` : ""
      }`,
    );

    if (summary.screen.eventTitle) {
      console.log(`Event: ${summary.screen.eventTitle}`);
    }

    if (summary.screen.eventDescription) {
      console.log(`Event text: ${summary.screen.eventDescription}`);
    }

    if (summary.screen.menuItems.length > 0) {
      console.log(
        `Items: ${summary.screen.menuItems
          .map((item) => {
            const title = item.label ?? item.id ?? "(untitled)";
            const flags = [
              item.enabled ? null : "disabled",
              item.selected ? "selected" : null,
            ]
              .filter(Boolean)
              .join(", ");
            return `${title}${flags ? ` [${flags}]` : ""}`;
          })
          .join(" | ")}`,
      );
    }

    if (summary.screen.characters.length > 0) {
      console.log(
        `Characters: ${summary.screen.characters
          .map((character) => `${character.id}${character.isLocked ? " [locked]" : ""}${character.isSelected ? " [selected]" : ""}`)
          .join(" | ")}`,
      );
    }
  }
}

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const explicitPath = args.find((arg) => !arg.startsWith("--")) ?? null;
const savePath = discoverSavePath(explicitPath);
const run = readJson(savePath);
const screenStatePath = discoverScreenStatePath();
const screenStateRaw = readOptionalJson(screenStatePath);
const screenState = screenStateRaw ? { ...screenStateRaw, _path: screenStatePath } : null;
const summary = summarizeRun(run, savePath, screenState);

if (jsonMode) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printText(summary);
}
