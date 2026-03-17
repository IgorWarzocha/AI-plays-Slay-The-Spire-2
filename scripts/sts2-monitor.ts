#!/usr/bin/env node

import fs from "node:fs";

import { readOptionalJson } from "./lib/json-io.ts";
import { STS2_RUNTIME_PATHS } from "./lib/runtime-paths.ts";
import type { CommandAck, DisplayState, LiveStatus } from "./lib/types.ts";
import { getWindow } from "./lib/window-detector.ts";

let lastLiveJson = "";
let lastScreenType: string | null = null;
let lastAckSignature: string | null = null;
let lastRunning: boolean | null = null;

function ensureRuntimeDir(): void {
  fs.mkdirSync(STS2_RUNTIME_PATHS.runtimeDir, { recursive: true });
}

function appendEvent(event: Record<string, unknown>): void {
  fs.appendFileSync(STS2_RUNTIME_PATHS.eventsPath, `${JSON.stringify(event)}\n`);
}

function writeLiveStatus(snapshot: LiveStatus): void {
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (json === lastLiveJson) {
    return;
  }

  lastLiveJson = json;
  fs.writeFileSync(STS2_RUNTIME_PATHS.liveStatusPath, json);
}

function pollOnce(): void {
  try {
    const window = getWindow();
    const running = Boolean(window);
    const state = readOptionalJson<DisplayState>(STS2_RUNTIME_PATHS.statePath);
    const ack = readOptionalJson<CommandAck>(STS2_RUNTIME_PATHS.ackPath);

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
  } catch (error) {
    appendEvent({
      type: "monitor_error",
      at: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function main(): void {
  ensureRuntimeDir();
  fs.writeFileSync(STS2_RUNTIME_PATHS.monitorPidPath, `${process.pid}\n`);

  const cleanup = () => {
    try {
      fs.rmSync(STS2_RUNTIME_PATHS.monitorPidPath, { force: true });
    } catch {}
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  setInterval(pollOnce, 250);
  pollOnce();
}

main();
