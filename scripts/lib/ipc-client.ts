import net from 'node:net';

import type { CommandAck, CommandPayload, DisplayState } from './types.ts';
import { STS2_RUNTIME_PATHS } from './runtime-paths.ts';
import { waitForAsync } from './time.ts';

interface SnapshotEnvelope {
  type: 'snapshot';
  state?: DisplayState | null;
  ack?: CommandAck | null;
  message?: string | null;
}

interface ErrorEnvelope {
  type: 'error';
  message?: string | null;
}

interface CommandEnvelope {
  type: 'command';
  command: CommandPayload;
}

interface SnapshotRequestEnvelope {
  type: 'snapshot';
}

type AgentEnvelope = SnapshotEnvelope | ErrorEnvelope;

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error;
}

export function isMissingIpcError(error: unknown): boolean {
  return isNodeError(error)
    && (error.code === 'ENOENT' || error.code === 'ECONNREFUSED' || error.code === 'EPIPE');
}

export class AgentIpcSession {
  private readonly socket: net.Socket;
  private buffer = '';
  private connected = false;
  private closed = false;
  private lastError: Error | null = null;
  private hasSnapshot = false;
  private snapshotVersion = 0;

  state: DisplayState | null = null;
  ack: CommandAck | null = null;

  private constructor(socket: net.Socket) {
    this.socket = socket;
    this.socket.setEncoding('utf8');

    this.socket.on('connect', () => {
      this.connected = true;
    });

    this.socket.on('data', (chunk: string | Buffer) => {
      this.buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      this.drainBuffer();
    });

    this.socket.on('error', (error) => {
      this.lastError = error;
    });

    this.socket.on('close', () => {
      this.closed = true;
    });
  }

  static async connect({ timeoutMs = 3000 }: { timeoutMs?: number } = {}): Promise<AgentIpcSession> {
    const socket = net.createConnection(STS2_RUNTIME_PATHS.socketPath);
    const session = new AgentIpcSession(socket);

    await waitForAsync(() => {
      if (session.lastError) {
        throw session.lastError;
      }

      return session.connected ? true : null;
    }, {
      timeoutMs,
      intervalMs: 25,
      description: 'IPC connection',
    });

    return session;
  }

  async waitForInitialSnapshot({ timeoutMs = 3000 }: { timeoutMs?: number } = {}): Promise<{ state: DisplayState | null; ack: CommandAck | null }> {
    this.requestSnapshot();
    const initialVersion = this.snapshotVersion;

    await waitForAsync(() => {
      this.assertHealthy();
      return this.snapshotVersion > initialVersion ? true : null;
    }, {
      timeoutMs,
      intervalMs: 25,
      description: 'initial IPC snapshot',
    });

    return { state: this.state, ack: this.ack };
  }

  requestSnapshot(): void {
    this.assertHealthy();
    const envelope: SnapshotRequestEnvelope = {
      type: 'snapshot',
    };
    this.socket.write(`${JSON.stringify(envelope)}\n`);
  }

  sendCommand(command: CommandPayload): void {
    this.assertHealthy();
    const envelope: CommandEnvelope = {
      type: 'command',
      command,
    };
    this.socket.write(`${JSON.stringify(envelope)}\n`);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.socket.end();
    this.socket.destroy();
  }

  assertHealthy(): void {
    if (this.lastError) {
      throw this.lastError;
    }

    if (this.closed) {
      throw new Error(this.hasSnapshot
        ? 'IPC session closed unexpectedly.'
        : 'IPC session closed before a snapshot was received.');
    }
  }

  private drainBuffer(): void {
    while (true) {
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const rawLine = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (!rawLine) {
        continue;
      }

      try {
        const envelope = JSON.parse(rawLine) as AgentEnvelope;
        if (envelope.type === 'snapshot') {
          this.state = envelope.state ?? null;
          this.ack = envelope.ack ?? null;
          this.hasSnapshot = true;
          this.snapshotVersion += 1;
          continue;
        }

        if (envelope.type === 'error') {
          this.lastError = new Error(envelope.message ?? 'IPC server reported an unknown error.');
        }
      } catch (error: unknown) {
        this.lastError = error instanceof Error
          ? error
          : new Error('IPC client failed to parse a server message.');
      }
    }
  }
}

export async function withAgentSession<T>(
  callback: (session: AgentIpcSession) => Promise<T>,
  { timeoutMs = 3000 }: { timeoutMs?: number } = {},
): Promise<T> {
  const session = await AgentIpcSession.connect({ timeoutMs });
  try {
    await session.waitForInitialSnapshot({ timeoutMs });
    return await callback(session);
  } finally {
    session.close();
  }
}

export async function readStateFromIpc({ timeoutMs = 3000 }: { timeoutMs?: number } = {}): Promise<DisplayState | null> {
  return withAgentSession(async (session) => session.state, { timeoutMs });
}

export async function readAckFromIpc({ timeoutMs = 3000 }: { timeoutMs?: number } = {}): Promise<CommandAck | null> {
  return withAgentSession(async (session) => session.ack, { timeoutMs });
}
