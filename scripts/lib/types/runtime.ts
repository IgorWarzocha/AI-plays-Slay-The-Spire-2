import type { DisplayState } from './display.ts';

export interface CommandPayload {
  id: string;
  action: string;
  character?: string;
  seed?: string;
  act1?: string;
}

export interface CommandAck {
  id: string;
  status: string;
  handledAtUtc?: string | null;
  message?: string | null;
}

export interface CombatCostChange {
  cardId: string;
  title: string | null;
  beforeCost: string | null;
  afterCost: string | null;
}

export interface ActionResult {
  action: string;
  resolvedAction?: string;
  id: string;
  ack?: CommandAck;
  settled?: boolean;
  ackStatus?: string;
  screenType?: string | null;
  costChanges?: CombatCostChange[];
  state?: DisplayState | null;
}

export interface RunActionsResult {
  ok: boolean;
  actionCount: number;
  results: ActionResult[];
  state: DisplayState | null;
}

export interface GameWindow {
  address?: string;
  class?: string;
  title?: string;
  [key: string]: unknown;
}

export interface LiveStatus {
  capturedAtUtc: string;
  running: boolean;
  window: GameWindow | null;
  state: DisplayState | null;
  ack: CommandAck | null;
}

export interface AdminStatus {
  running: boolean;
  window: GameWindow | null;
  state: {
    screenType: string | null;
    updatedAtUtc: string | null;
    lastHandledCommandId: string | null;
  } | null;
  ack: CommandAck | null;
}
