import type { DisplayState } from './types.ts';

export interface Coord {
  col: number;
  row: number;
}

export interface SaveNode {
  coord: Coord;
  type?: string | null;
  can_modify?: boolean | null;
  children?: Coord[];
}

export interface SaveMap {
  start?: SaveNode | null;
  points?: SaveNode[];
}

export interface SaveRooms {
  ancient_id?: string | null;
  boss_id?: string | null;
}

export interface SaveAct {
  id: string;
  saved_map?: SaveMap | null;
  rooms?: SaveRooms | null;
}

export interface SaveCard {
  id: string;
  upgraded?: boolean;
}

export interface SaveRelic {
  id: string;
}

export interface SavePlayer {
  character_id: string;
  current_hp: number;
  max_hp: number;
  gold: number;
  max_energy: number;
  relics?: SaveRelic[];
  deck?: SaveCard[];
}

export interface SaveRun {
  save_time?: number;
  start_time?: number;
  run_time?: number | null;
  ascension?: number | null;
  current_act_index: number;
  acts?: SaveAct[];
  players?: SavePlayer[];
  visited_map_coords?: Coord[];
  extra_fields?: {
    started_with_neow?: boolean;
  } | null;
  pre_finished_room?: boolean | null;
  win_time?: number | null;
}

export interface ScreenStateWithPath extends DisplayState {
  _path: string;
  source?: string | null;
  topBar?: (DisplayState['topBar'] & { visible?: boolean }) | null;
  cardBrowse?: (DisplayState['cardBrowse'] & { sorts?: Array<{ label?: string | null }> }) | null;
}

export interface SimplifiedNode {
  coord: Coord;
  type: string | null | undefined;
  canModify: boolean | null;
  nextCoords: Coord[];
}

export interface RunSummary {
  savePath: string;
  screenStatePath: string | null;
  saveTimeUnix: number | undefined;
  saveTimeIso: string | null;
  startTimeUnix: number | undefined;
  startTimeIso: string | null;
  runTimeSeconds: number | null;
  ascension: number | null;
  act: {
    index: number;
    number: number;
    id: string;
    shortId: string;
    ancientId: string | null;
    bossId: string | null;
  };
  position: {
    visitedCount: number;
    visitedCoords: Coord[];
    currentNode: SimplifiedNode | null;
    nextNodes: SimplifiedNode[];
  };
  player: {
    characterId: string;
    characterShortId: string;
    currentHp: number;
    maxHp: number;
    gold: number;
    maxEnergy: number;
    relics: Array<{ id: string; shortId: string }>;
    deckCount: number;
    deck: Array<{ id: string; shortId: string; upgraded: boolean }>;
  };
  flags: {
    startedWithNeow: boolean;
    preFinishedRoom: boolean | null;
    won: boolean;
  };
  screen: {
    source: string | null;
    updatedAtUtc: string | null;
    screenType: string | null;
    eventTitle: string | null;
    eventDescription: string | null;
    actions: string[];
    menuItems: Array<{ id: string | null; label: string | null; visible: boolean; enabled: boolean; selected: boolean }>;
    characters: DisplayState['characters'];
    characterSelection: string | null;
    topBar: ScreenStateWithPath['topBar'];
    relics: DisplayState['relics'];
    map: DisplayState['map'];
    cardBrowse: ScreenStateWithPath['cardBrowse'];
    combat: DisplayState['combat'];
  } | null;
}
