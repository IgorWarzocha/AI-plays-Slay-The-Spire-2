import type { LiveStatus } from './types.ts';
import fs from "node:fs";
import { spawn } from "node:child_process";

import { readOptionalJson } from "./json-io.ts";
import { STS2_RUNTIME_PATHS } from "./runtime-paths.ts";

function ensureRuntimeDir(): void {
  fs.mkdirSync(STS2_RUNTIME_PATHS.runtimeDir, { recursive: true });
}

export function readLiveStatus(): LiveStatus | null {
  return readOptionalJson<LiveStatus>(STS2_RUNTIME_PATHS.liveStatusPath);
}

export function readMonitorPid(): number | null {
  if (!fs.existsSync(STS2_RUNTIME_PATHS.monitorPidPath)) {
    return null;
  }

  const pid = Number(fs.readFileSync(STS2_RUNTIME_PATHS.monitorPidPath, "utf8").trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

export function isMonitorRunning(): boolean {
  const pid = readMonitorPid();
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function startMonitor(): number | null {
  if (isMonitorRunning()) {
    return readMonitorPid();
  }

  ensureRuntimeDir();
  const child = spawn(process.execPath, [STS2_RUNTIME_PATHS.monitorScript], {
    cwd: STS2_RUNTIME_PATHS.repoRoot,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  fs.writeFileSync(STS2_RUNTIME_PATHS.monitorPidPath, `${child.pid}\n`);
  return child.pid ?? null;
}

export function stopMonitor(): boolean {
  const pid = readMonitorPid();
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Ignore stale pidfiles; cleanup below removes the dead pidfile.
  }

  try {
    fs.rmSync(STS2_RUNTIME_PATHS.monitorPidPath, { force: true });
  } catch {}

  return true;
}
