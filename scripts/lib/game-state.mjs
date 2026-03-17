import { readOptionalJson } from "./json-io.mjs";
import { readLiveStatus } from "./monitor-client.mjs";
import { STS2_RUNTIME_PATHS } from "./runtime-paths.mjs";

function parseInstant(value) {
  if (!value || typeof value !== "string") {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function selectNewest(liveValue, fileValue, timestampKey) {
  if (!liveValue) {
    return fileValue ?? null;
  }

  if (!fileValue) {
    return liveValue;
  }

  const liveTimestamp = parseInstant(liveValue[timestampKey]);
  const fileTimestamp = parseInstant(fileValue[timestampKey]);
  return fileTimestamp > liveTimestamp ? fileValue : liveValue;
}

export function chooseNewestState(liveState, fileState) {
  return selectNewest(liveState, fileState, "updatedAtUtc");
}

export function chooseNewestAck(liveAck, fileAck) {
  return selectNewest(liveAck, fileAck, "handledAtUtc");
}

export function readState() {
  const liveState = readLiveStatus()?.state ?? null;
  const fileState = readOptionalJson(STS2_RUNTIME_PATHS.statePath);
  return chooseNewestState(liveState, fileState);
}

export function readAck() {
  const liveAck = readLiveStatus()?.ack ?? null;
  const fileAck = readOptionalJson(STS2_RUNTIME_PATHS.ackPath);
  return chooseNewestAck(liveAck, fileAck);
}
