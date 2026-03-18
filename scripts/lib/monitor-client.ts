import type { CommandAck, DisplayState, LiveStatus } from './types.ts';

import { isMissingIpcError, withAgentSession } from './ipc-client.ts';
import { getWindow } from './window-detector.ts';

export async function captureLiveStatus(): Promise<LiveStatus> {
  const window = getWindow();
  const running = Boolean(window);
  let state: DisplayState | null = null;
  let ack: CommandAck | null = null;

  try {
    const snapshot = await withAgentSession(async (session) => ({
      state: session.state,
      ack: session.ack,
    }));
    state = snapshot.state;
    ack = snapshot.ack;
  } catch (error: unknown) {
    if (!isMissingIpcError(error)) {
      throw error;
    }
  }

  return {
    capturedAtUtc: new Date().toISOString(),
    running,
    window,
    state,
    ack,
  };
}
