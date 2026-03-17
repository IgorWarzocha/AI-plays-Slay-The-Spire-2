import type { AdminStatus } from './types.ts';

export { parseArgs } from "./args.ts";
export { readJson, readOptionalJson, writeJson } from "./json-io.ts";
export { readLiveStatus, readMonitorPid, isMonitorRunning, startMonitor, stopMonitor } from "./monitor-client.ts";
export { readState, readAck } from "./game-state.ts";
export { getWindow, isRunning } from "./window-detector.ts";
export { launchGame, quitGame, restartGame } from "./process-manager.ts";
export { waitForAck, waitForCommandSettlement, waitForFollowThrough, waitForScreen, sendAction, runActions, startStandardRun, readDisplayState } from "./command-client.ts";

import { readAck, readState } from "./game-state.ts";
import { readLiveStatus, isMonitorRunning, readMonitorPid } from "./monitor-client.ts";
import { getWindow } from "./window-detector.ts";

export function buildAdminStatus(): AdminStatus {
  const live = readLiveStatus();
  const window = live?.window ?? getWindow();
  const state = live?.state ?? readState();
  const ack = live?.ack ?? readAck();

  return {
    running: Boolean(window),
    monitor: {
      running: isMonitorRunning(),
      pid: readMonitorPid(),
    },
    window,
    state: state ? {
      screenType: state.screenType ?? null,
      updatedAtUtc: state.updatedAtUtc ?? null,
      lastHandledCommandId: state.lastHandledCommandId ?? null,
    } : null,
    ack,
  };
}
