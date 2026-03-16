#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const APP_ID = "2868840";
const GAME_CLASS = "Slay the Spire 2";
const HOME = os.homedir();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const RUNTIME_DIR = path.join(REPO_ROOT, "runtime");
const MONITOR_SCRIPT = path.join(SCRIPT_DIR, "sts2-monitor.mjs");
const MONITOR_PID_PATH = path.join(RUNTIME_DIR, "sts2-monitor.pid");
const LIVE_STATUS_PATH = path.join(RUNTIME_DIR, "sts2-live.json");
const AGENT_DIR = path.join(HOME, ".local", "share", "SlayTheSpire2", "agent_state");
const STATE_PATH = path.join(AGENT_DIR, "screen_state.json");
const ACK_PATH = path.join(AGENT_DIR, "command_ack.json");
const COMMAND_PATH = path.join(AGENT_DIR, "command.json");

function run(command, args, { allowFailure = false } = {}) {
  try {
    return execFileSync(command, args, { encoding: "utf8" }).trim();
  } catch (error) {
    if (allowFailure) {
      return "";
    }

    throw error;
  }
}

function shell(command) {
  return run("bash", ["-lc", command]);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function parseArgs(argv) {
  const options = {};
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { positional, options };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptionalJson(filePath) {
  return fs.existsSync(filePath) ? readJson(filePath) : null;
}

function readLiveStatus() {
  return readOptionalJson(LIVE_STATUS_PATH);
}

function getWindow() {
  const output = run(
    "hyprctl",
    ["clients", "-j"],
    { allowFailure: true },
  );

  if (!output) {
    return null;
  }

  const clients = JSON.parse(output);
  return clients.find((client) => client.class === GAME_CLASS || client.title === GAME_CLASS) ?? null;
}

function isRunning() {
  return Boolean(getWindow());
}

function waitFor(predicate, { timeoutMs = 45000, intervalMs = 200, description = "condition" } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const value = predicate();
    if (value) {
      return value;
    }

    sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${description}.`);
}

function launchGame({ timeoutMs = 45000, readyTimeoutMs = 20000 } = {}) {
  const launchStartedAtIso = new Date().toISOString();
  startMonitor();

  if (isRunning()) {
    return getWindow();
  }

  spawn("bash", ["-lc", `setsid steam -applaunch ${APP_ID} >/tmp/sts2-launch.log 2>&1 < /dev/null &`], {
    detached: true,
    stdio: "ignore",
  }).unref();

  const window = waitFor(() => getWindow(), { timeoutMs, intervalMs: 500, description: "STS2 window" });
  waitFor(
    () => {
      const state = readState();
      return state?.updatedAtUtc && state.updatedAtUtc >= launchStartedAtIso ? state : null;
    },
    { timeoutMs: readyTimeoutMs, intervalMs: 250, description: "fresh STS2 state heartbeat" },
  );
  return window;
}

function quitGame() {
  const window = getWindow();
  if (!window) {
    return false;
  }

  run("hyprctl", ["dispatch", "closewindow", `address:${window.address}`]);
  waitFor(() => !getWindow(), { timeoutMs: 15000, intervalMs: 250, description: "STS2 to exit" });
  return true;
}

function restartGame() {
  quitGame();
  return launchGame();
}

function readState() {
  return readLiveStatus()?.state ?? readOptionalJson(STATE_PATH);
}

function readAck() {
  return readLiveStatus()?.ack ?? readOptionalJson(ACK_PATH);
}

function stableJson(value) {
  return JSON.stringify(value ?? null);
}

function isExplicitFalse(value) {
  return value === false || value === "false" || value === "0";
}

function writeCommand(command) {
  fs.mkdirSync(AGENT_DIR, { recursive: true });
  fs.writeFileSync(COMMAND_PATH, `${JSON.stringify(command, null, 2)}\n`);
  return command.id;
}

function ensureRuntimeDir() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function readMonitorPid() {
  if (!fs.existsSync(MONITOR_PID_PATH)) {
    return null;
  }

  const pid = Number(fs.readFileSync(MONITOR_PID_PATH, "utf8").trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function isMonitorRunning() {
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

function startMonitor() {
  if (isMonitorRunning()) {
    return readMonitorPid();
  }

  ensureRuntimeDir();
  const child = spawn(process.execPath, [MONITOR_SCRIPT], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  fs.writeFileSync(MONITOR_PID_PATH, `${child.pid}\n`);
  return child.pid;
}

function stopMonitor() {
  const pid = readMonitorPid();
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Ignore stale pidfiles; they are cleaned up below.
  }

  try {
    fs.rmSync(MONITOR_PID_PATH, { force: true });
  } catch {}

  return true;
}

function waitForAck(id, { timeoutMs = 10000 } = {}) {
  return waitFor(
    () => {
      const ack = readAck();
      return ack && ack.id === id ? ack : null;
    },
    { timeoutMs, intervalMs: 150, description: `ack ${id}` },
  );
}

function waitForCommandSettlement(id, beforeState, { timeoutMs = 6000 } = {}) {
  const beforeJson = stableJson(beforeState);
  const beforeUpdatedAt = beforeState?.updatedAtUtc ?? null;

  return waitFor(
    () => {
      const ack = readAck();
      if (ack?.id === id && ack.status === "error") {
        throw new Error(ack.message ?? `Command ${id} failed.`);
      }

      const state = readState();
      if (!state || state.lastHandledCommandId !== id) {
        return null;
      }

      const afterJson = stableJson(state);
      const updatedChanged = state.updatedAtUtc && state.updatedAtUtc !== beforeUpdatedAt;
      if (updatedChanged && afterJson !== beforeJson) {
        return { ack, state };
      }

      return null;
    },
    { timeoutMs, intervalMs: 150, description: `command ${id} state mutation` },
  );
}

function waitForScreen(screenType, { timeoutMs = 15000 } = {}) {
  return waitFor(
    () => {
      const state = readState();
      return state?.screenType === screenType ? state : null;
    },
    { timeoutMs, intervalMs: 150, description: `screen ${screenType}` },
  );
}

function sendAction(action, options = {}) {
  const id = options.id ?? `cmd-${Date.now()}`;
  const beforeState = readState();
  const payload = {
    id,
    action,
    ...(options.character ? { character: options.character } : {}),
    ...(options.seed ? { seed: options.seed } : {}),
    ...(options.act1 ? { act1: options.act1 } : {}),
  };

  writeCommand(payload);
  const ack = waitForAck(id);
  if (isExplicitFalse(options.strict)) {
    return ack;
  }

  if (ack.status === "error") {
    return ack;
  }

  const result = waitForCommandSettlement(id, beforeState, {
    timeoutMs: Number(options["settle-timeout-ms"] ?? options.settleTimeoutMs ?? 6000),
  });

  return {
    ...ack,
    settled: true,
    screenType: result.state?.screenType ?? null,
  };
}

function printStatus() {
  const live = readLiveStatus();
  const window = live?.window ?? getWindow();
  const state = live?.state ?? readState();
  const ack = live?.ack ?? readAck();
  const monitorPid = readMonitorPid();

  console.log(JSON.stringify({
    running: Boolean(window),
    monitor: {
      running: isMonitorRunning(),
      pid: monitorPid,
    },
    window,
    state,
    ack,
  }, null, 2));
}

function startStandardRun(options) {
  launchGame();
  waitForScreen("main_menu", { timeoutMs: 60000 });
  sendAction("main_menu.singleplayer", { id: `cmd-${Date.now()}-menu` });
  waitForScreen("singleplayer_submenu");
  sendAction("singleplayer.standard", { id: `cmd-${Date.now()}-singleplayer` });
  waitForScreen("character_select");
  const ack = sendAction("character.start_run", {
    id: `cmd-${Date.now()}-start`,
    character: options.character ?? "ironclad",
    seed: options.seed,
    act1: options.act1 ?? "act1",
  });

  waitFor(
    () => {
      const state = readState();
      return state && state.screenType !== "character_select" ? state : null;
    },
    { timeoutMs: 20000, intervalMs: 250, description: "run to leave character select" },
  );

  return ack;
}

function usage() {
  console.log(`Usage:
  sts2ctl.mjs status
  sts2ctl.mjs launch
  sts2ctl.mjs quit
  sts2ctl.mjs restart
  sts2ctl.mjs monitor-start
  sts2ctl.mjs monitor-stop
  sts2ctl.mjs monitor-status
  sts2ctl.mjs command <action> [--character <id>] [--seed <seed>] [--act1 <act>] [--strict false] [--settle-timeout-ms <ms>]
  sts2ctl.mjs wait-screen <screenType>
  sts2ctl.mjs start-standard [--character <id>] [--seed <seed>] [--act1 <act>]
`);
}

function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  switch (command) {
    case "status":
      printStatus();
      return;
    case "launch":
      launchGame();
      printStatus();
      return;
    case "quit":
      quitGame();
      printStatus();
      return;
    case "restart":
      restartGame();
      printStatus();
      return;
    case "monitor-start":
      console.log(JSON.stringify({ pid: startMonitor() }, null, 2));
      return;
    case "monitor-stop":
      console.log(JSON.stringify({ stopped: stopMonitor() }, null, 2));
      return;
    case "monitor-status":
      console.log(JSON.stringify({ running: isMonitorRunning(), pid: readMonitorPid() }, null, 2));
      return;
    case "command": {
      const action = positional[1];
      if (!action) {
        throw new Error("command requires an action.");
      }

      const ack = sendAction(action, options);
      console.log(JSON.stringify(ack, null, 2));
      return;
    }
    case "wait-screen": {
      const screenType = positional[1];
      if (!screenType) {
        throw new Error("wait-screen requires a screen type.");
      }

      const state = waitForScreen(screenType);
      console.log(JSON.stringify(state, null, 2));
      return;
    }
    case "start-standard": {
      const ack = startStandardRun(options);
      console.log(JSON.stringify(ack, null, 2));
      return;
    }
    default:
      usage();
      if (command) {
        process.exitCode = 1;
      }
  }
}

main();
