#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HOME = os.homedir();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const RUNTIME_DIR = path.join(REPO_ROOT, "runtime");
const LIVE_STATUS_PATH = path.join(RUNTIME_DIR, "sts2-live.json");
const EVENTS_PATH = path.join(RUNTIME_DIR, "sts2-events.ndjson");
const PID_PATH = path.join(RUNTIME_DIR, "sts2-monitor.pid");
const AGENT_DIR = path.join(HOME, ".local", "share", "SlayTheSpire2", "agent_state");
const STATE_PATH = path.join(AGENT_DIR, "screen_state.json");
const ACK_PATH = path.join(AGENT_DIR, "command_ack.json");
const GAME_CLASS = "Slay the Spire 2";

let lastLiveJson = "";
let lastScreenType = null;
let lastAckSignature = null;
let lastRunning = null;

function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readOptionalJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getWindow() {
  const output = run("hyprctl", ["clients", "-j"]);
  if (!output) {
    return null;
  }

  const clients = JSON.parse(output);
  return clients.find((client) => client.class === GAME_CLASS || client.title === GAME_CLASS) ?? null;
}

function ensureRuntimeDir() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function appendEvent(event) {
  fs.appendFileSync(EVENTS_PATH, `${JSON.stringify(event)}\n`);
}

function writeLiveStatus(snapshot) {
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (json === lastLiveJson) {
    return;
  }

  lastLiveJson = json;
  fs.writeFileSync(LIVE_STATUS_PATH, json);
}

function pollOnce() {
  const window = getWindow();
  const running = Boolean(window);
  const state = readOptionalJson(STATE_PATH);
  const ack = readOptionalJson(ACK_PATH);

  writeLiveStatus({
    capturedAtUtc: new Date().toISOString(),
    running,
    window,
    state,
    ack,
  });

  if (running !== lastRunning) {
    appendEvent({ type: "running", at: new Date().toISOString(), running });
    lastRunning = running;
  }

  if (state?.screenType && state.screenType !== lastScreenType) {
    appendEvent({ type: "screen", at: new Date().toISOString(), screenType: state.screenType });
    lastScreenType = state.screenType;
  }

  const ackSignature = ack ? `${ack.id}:${ack.status}:${ack.message ?? ""}` : null;
  if (ackSignature && ackSignature !== lastAckSignature) {
    appendEvent({ type: "ack", at: new Date().toISOString(), ack });
    lastAckSignature = ackSignature;
  }
}

function main() {
  ensureRuntimeDir();
  fs.writeFileSync(PID_PATH, `${process.pid}\n`);

  const cleanup = () => {
    try {
      fs.rmSync(PID_PATH, { force: true });
    } catch {}
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  setInterval(pollOnce, 250);
  pollOnce();
}

main();
