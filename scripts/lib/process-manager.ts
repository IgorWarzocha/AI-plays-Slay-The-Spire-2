import { spawn } from "node:child_process";

import { STS2_RUNTIME_PATHS } from "./runtime-paths.ts";
import { run } from "./shell.ts";
import { waitFor, waitForAsync } from "./time.ts";
import { readState } from "./game-state.ts";
import { getWindow, isRunning } from "./window-detector.ts";

export async function launchGame({ timeoutMs = 45000, readyTimeoutMs = 20000 } = {}) {
  const launchStartedAtIso = new Date().toISOString();

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

  await waitForAsync(
    async () => {
      const state = await readState();
      return state?.updatedAtUtc && state.updatedAtUtc >= launchStartedAtIso ? state : null;
    },
    { timeoutMs: readyTimeoutMs, intervalMs: 250, description: "fresh STS2 state heartbeat" },
  );

  return window;
}

export async function quitGame() {
  const window = getWindow();
  if (!window) {
    return false;
  }

  run("hyprctl", ["dispatch", "closewindow", `address:${window.address}`]);
  waitFor(() => !getWindow(), { timeoutMs: 15000, intervalMs: 250, description: "STS2 to exit" });
  return true;
}

export async function restartGame() {
  await quitGame();
  const window = await launchGame();
  await waitForAsync(
    async () => {
      const state = await readState();
      if (!state?.screenType) {
        return null;
      }

      if (state.screenType === "unknown" || state.screenType === "booting" || state.screenType === "run_active") {
        return null;
      }

      return state;
    },
    { timeoutMs: 90000, intervalMs: 500, description: "surfaced STS2 screen after restart" },
  );
  return window;
}
