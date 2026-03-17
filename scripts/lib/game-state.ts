import type { CommandAck, DisplayState } from './types.ts';
import { readOptionalJson } from './json-io.ts';
import { STS2_RUNTIME_PATHS } from './runtime-paths.ts';

function parseInstant(value: string | null | undefined): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function selectNewestStateLike<T>(
  liveValue: T | null,
  fileValue: T | null,
  getTimestamp: (value: T) => string | null | undefined,
): T | null {
  if (!liveValue) {
    return fileValue ?? null;
  }

  if (!fileValue) {
    return liveValue;
  }

  const liveTimestamp = parseInstant(getTimestamp(liveValue));
  const fileTimestamp = parseInstant(getTimestamp(fileValue));
  return fileTimestamp > liveTimestamp ? fileValue : liveValue;
}

export function chooseNewestState(liveState: DisplayState | null, fileState: DisplayState | null): DisplayState | null {
  return selectNewestStateLike(liveState, fileState, (value) => value.updatedAtUtc);
}

export function chooseNewestAck(liveAck: CommandAck | null, fileAck: CommandAck | null): CommandAck | null {
  return selectNewestStateLike(liveAck, fileAck, (value) => value.handledAtUtc);
}

export function readState(): DisplayState | null {
  return readOptionalJson<DisplayState>(STS2_RUNTIME_PATHS.statePath);
}

export function readAck(): CommandAck | null {
  return readOptionalJson<CommandAck>(STS2_RUNTIME_PATHS.ackPath);
}
