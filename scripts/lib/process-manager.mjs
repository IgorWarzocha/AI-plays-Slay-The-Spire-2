import { spawn } from "node:child_process";

import { startMonitor } from "./monitor-client.mjs";
import { STS2_RUNTIME_PATHS } from "./runtime-paths.mjs";
import { run } from "./shell.mjs";
import { sleep, waitFor } from "./time.mjs";
import { readState } from "./game-state.mjs";
import { getWindow, isRunning } from "./window-detector.mjs";

export function launchGame({ timeoutMs = 45000, readyTimeoutMs = 20000 } = {}) {
  const launchStartedAtIso = new Date().toISOString();
  startMonitor();

  if (isRunning()) {
    return getWindow();
  }

  spawn("bash", ["-lc", `setsid steam -applaunch ${STS2_RUNTIME_PATHS.appId} >/tmp/sts2-launch.log 2>&1 < /dev/null &`], {
    detached: true,
    stdio: "ignore",
  }).unref();

  const window = waitFor(() => getWindow(), {
    timeoutMs,
    intervalMs: 500,
    description: "STS2 window",
  });

  waitFor(
    () => {
      const state = readState();
      return state?.updatedAtUtc && state.updatedAtUtc >= launchStartedAtIso ? state : null;
    },
    { timeoutMs: readyTimeoutMs, intervalMs: 250, description: "fresh STS2 state heartbeat" },
  );

  return window;
}

export function quitGame() {
  const window = getWindow();
  if (!window) {
    return false;
  }

  run("hyprctl", ["dispatch", "closewindow", `address:${window.address}`]);
  waitFor(() => !getWindow(), { timeoutMs: 15000, intervalMs: 250, description: "STS2 to exit" });
  return true;
}

export function restartGame() {
  quitGame();
  const window = launchGame();
  // A fixed cooldown makes restart self-contained for STS2's slow bootstrap.
  sleep(20000);
  return window;
}
