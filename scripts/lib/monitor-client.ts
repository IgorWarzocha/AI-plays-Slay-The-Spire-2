import type { CommandAck, DisplayState, LiveStatus } from './types.ts';

import { readOptionalJson } from "./json-io.ts";
import { STS2_RUNTIME_PATHS } from "./runtime-paths.ts";
import { getWindow } from './window-detector.ts';

export function captureLiveStatus(): LiveStatus {
  const window = getWindow();
  const running = Boolean(window);
  const state = readOptionalJson<DisplayState>(STS2_RUNTIME_PATHS.statePath);
  const ack = readOptionalJson<CommandAck>(STS2_RUNTIME_PATHS.ackPath);

  return {
    capturedAtUtc: new Date().toISOString(),
    running,
    window,
    state,
    ack,
  };
}
