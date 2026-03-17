export { parseArgs } from "./args.mjs";
export { readJson, readOptionalJson, writeJson } from "./json-io.mjs";
export { readLiveStatus, readMonitorPid, isMonitorRunning, startMonitor, stopMonitor } from "./monitor-client.mjs";
export { readState, readAck } from "./game-state.mjs";
export { getWindow, isRunning } from "./window-detector.mjs";
export { launchGame, quitGame, restartGame } from "./process-manager.mjs";
export { waitForAck, waitForCommandSettlement, waitForFollowThrough, waitForScreen, sendAction, runActions, startStandardRun, readDisplayState } from "./command-client.mjs";

import { readAck, readState } from "./game-state.mjs";
import { readLiveStatus, isMonitorRunning, readMonitorPid } from "./monitor-client.mjs";
import { getWindow } from "./window-detector.mjs";

export function buildAdminStatus() {
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
