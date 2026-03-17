import type { AdminStatus } from './types.ts';

export { parseArgs } from "./args.ts";
export { readJson, readOptionalJson, writeJson } from "./json-io.ts";
export { captureLiveStatus } from "./monitor-client.ts";
export { readState, readAck } from "./game-state.ts";
export { getWindow, isRunning } from "./window-detector.ts";
export { launchGame, quitGame, restartGame } from "./process-manager.ts";
export { waitForAck, waitForCommandSettlement, waitForFollowThrough, waitForScreen, sendAction, runActions, startStandardRun, readDisplayState } from "./command-client.ts";

import { readAck, readState } from "./game-state.ts";
import { getWindow } from "./window-detector.ts";

export function buildAdminStatus(): AdminStatus {
  const window = getWindow();
  const state = readState();
  const ack = readAck();

  return {
    running: Boolean(window),
    window,
    state: state ? {
      screenType: state.screenType ?? null,
      updatedAtUtc: state.updatedAtUtc ?? null,
      lastHandledCommandId: state.lastHandledCommandId ?? null,
    } : null,
    ack,
  };
}
