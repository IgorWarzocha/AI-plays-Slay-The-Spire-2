import { readOptionalJson } from "./json-io.mjs";
import { readLiveStatus } from "./monitor-client.mjs";
import { STS2_RUNTIME_PATHS } from "./runtime-paths.mjs";

export function readState() {
  return readLiveStatus()?.state ?? readOptionalJson(STS2_RUNTIME_PATHS.statePath);
}

export function readAck() {
  return readLiveStatus()?.ack ?? readOptionalJson(STS2_RUNTIME_PATHS.ackPath);
}
