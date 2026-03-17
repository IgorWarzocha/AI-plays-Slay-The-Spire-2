import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { DisplayState } from './types.ts';
import type {
  Coord,
  RouteOption,
  RoutePreview,
  RunSummary,
  SaveNode,
  SaveRun,
  ScreenStateWithPath,
  SimplifiedNode,
} from './run-save-summary-types.ts';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readOptionalJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return readJson<T>(filePath);
}

function formatUnixSeconds(value: number | null | undefined): string | null {
  if (!Number.isFinite(value) || value == null || value <= 0) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function stripPrefix(value: string): string {
  const index = value.lastIndexOf('.');
  return index === -1 ? value : value.slice(index + 1);
}

export function discoverSavePath(explicitPath: string | null): string {
  if (explicitPath) {
    return explicitPath;
  }

  const steamRoot = path.join(os.homedir(), '.local', 'share', 'SlayTheSpire2', 'steam');

  if (!fs.existsSync(steamRoot)) {
    fail(`STS2 steam save root not found: ${steamRoot}`);
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

  if (candidates.length === 0) {
    fail(`No current_run.save found under ${steamRoot}`);
  }

  return candidates[0]?.path ?? fail(`No current_run.save found under ${steamRoot}`);
}

function discoverScreenStatePath(): string {
  return path.join(os.homedir(), '.local', 'share', 'SlayTheSpire2', 'agent_state', 'screen_state.json');
}

function coordKey(coord: Coord): string {
  return `${coord.col},${coord.row}`;
}

function simplifyNode(node: SaveNode | null | undefined): SimplifiedNode | null {
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

function buildPointIndex(points: SaveNode[]): Map<string, SaveNode> {
  const index = new Map<string, SaveNode>();
  for (const point of points) {
    index.set(coordKey(point.coord), point);
  }
  return index;
}

function normalizeNodeType(type: string | null | undefined): string {
  return String(type ?? '').toLowerCase();
}

function countRoutePreview(path: SimplifiedNode[]): RoutePreview['counts'] {
  const counts: RoutePreview['counts'] = {
    monsters: 0,
    unknowns: 0,
    elites: 0,
    rests: 0,
    shops: 0,
    treasures: 0,
  };

  for (const node of path) {
    switch (normalizeNodeType(node.type)) {
      case 'monster':
        counts.monsters += 1;
        break;
      case 'unknown':
        counts.unknowns += 1;
        break;
      case 'elite':
        counts.elites += 1;
        break;
      case 'rest_site':
      case 'restsite':
        counts.rests += 1;
        break;
      case 'shop':
        counts.shops += 1;
        break;
      case 'treasure':
        counts.treasures += 1;
        break;
      default:
        break;
    }
  }

  return counts;
}

function findBossRow(points: SaveNode[], minimumRowExclusive: number): number | null {
  const bossRows = points
    .filter((point) => normalizeNodeType(point.type) === 'boss' && point.coord.row > minimumRowExclusive)
    .map((point) => point.coord.row)
    .sort((left, right) => left - right);

  return bossRows[0] ?? null;
}

function buildRouteOptions(currentNode: SaveNode | null, points: SaveNode[], pointIndex: Map<string, SaveNode>): RouteOption[] {
  if (!currentNode) {
    return [];
  }

  const targetRow = findBossRow(points, currentNode.coord.row);
  const starts = (currentNode.children ?? [])
    .map((coord) => pointIndex.get(coordKey(coord)) ?? null)
    .filter((node): node is SaveNode => node !== null);

  return starts
    .map((startNode): RouteOption | null => {
      const start = simplifyNode(startNode);
      if (!start) {
        return null;
      }

      const previews: RoutePreview[] = [];
      const seen = new Set<string>();

      const visit = (node: SaveNode, path: SimplifiedNode[]): void => {
        const simplified = simplifyNode(node);
        if (!simplified) {
          return;
        }

        const nextPath = [...path, simplified];
        const children = (node.children ?? [])
          .map((coord) => pointIndex.get(coordKey(coord)) ?? null)
          .filter((child): child is SaveNode => child !== null);
        const reachedTargetRow = targetRow != null && node.coord.row >= targetRow;

        if (reachedTargetRow || children.length === 0) {
          const signature = nextPath.map((entry) => coordKey(entry.coord)).join('>');
          if (seen.has(signature)) {
            return;
          }

          seen.add(signature);
          previews.push({
            path: nextPath,
            counts: countRoutePreview(nextPath),
          });
          return;
        }

        for (const child of children) {
          visit(child, nextPath);
        }
      };

      visit(startNode, []);

      return {
        start,
        targetRow,
        previews,
      };
    })
    .filter((option): option is RouteOption => option !== null);
}

function buildSummaryScreen(screenState: ScreenStateWithPath | null): RunSummary['screen'] {
  if (!screenState) {
    return null;
  }

  return {
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
          visible: Boolean((item as { visible?: boolean }).visible),
          enabled: Boolean(item.enabled),
          selected: Boolean(item.selected),
        }))
      : [],
    characters: Array.isArray(screenState.characters) ? screenState.characters : [],
    characterSelection: screenState.characterSelection ?? null,
    topBar: screenState.topBar ?? null,
    relics: Array.isArray(screenState.relics) ? screenState.relics : [],
    potions: Array.isArray(screenState.potions) ? screenState.potions : [],
    map: screenState.map ?? null,
    cardBrowse: screenState.cardBrowse ?? null,
    combat: screenState.combat ?? null,
  };
}

function summarizeRun(run: SaveRun, savePath: string, screenState: ScreenStateWithPath | null): RunSummary {
  const actIndex = run.current_act_index;
  const act = run.acts?.[actIndex];
  const player = run.players?.[0];

  if (!act) {
    fail(`No act found at current_act_index=${actIndex}`);
  }

  if (!player) {
    fail('No player state found in current_run.save');
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
    .map((coord) => pointIndex.get(coordKey(coord)) ?? null)
    .filter((node): node is SaveNode => node !== null)
    .map(simplifyNode)
    .filter((node): node is SimplifiedNode => node !== null);
  const currentFloor = Math.max(0, visited.length - 1);
  const routeOptions = buildRouteOptions(currentNode, points, pointIndex);

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
      bossShortId: act.rooms?.boss_id ? stripPrefix(act.rooms.boss_id) : null,
    },
    position: {
      visitedCount: visited.length,
      currentFloor,
      nextFloor: nextNodes.length > 0 ? currentFloor + 1 : null,
      visitedCoords: visited,
      currentNode: simplifyNode(currentNode),
      nextNodes,
      routeOptions,
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
    screen: buildSummaryScreen(screenState),
  };
}

export function buildRunSummary(explicitPath: string | null): RunSummary {
  const savePath = discoverSavePath(explicitPath);
  const run = readJson<SaveRun>(savePath);
  const screenStatePath = discoverScreenStatePath();
  const screenStateRaw = readOptionalJson<DisplayState>(screenStatePath);
  const screenState = screenStateRaw ? { ...screenStateRaw, _path: screenStatePath } as ScreenStateWithPath : null;
  return summarizeRun(run, savePath, screenState);
}
