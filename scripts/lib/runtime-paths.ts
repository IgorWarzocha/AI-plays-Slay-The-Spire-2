import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOME = os.homedir();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const RUNTIME_DIR = path.join(REPO_ROOT, 'runtime');
const AGENT_DIR = path.join(HOME, '.local', 'share', 'SlayTheSpire2', 'agent_state');

export const STS2_RUNTIME_PATHS = {
  appId: '2868840',
  gameClass: 'Slay the Spire 2',
  repoRoot: REPO_ROOT,
  runtimeDir: RUNTIME_DIR,
  monitorScript: path.join(REPO_ROOT, 'scripts', 'sts2-monitor.ts'),
  monitorPidPath: path.join(RUNTIME_DIR, 'sts2-monitor.pid'),
  liveStatusPath: path.join(RUNTIME_DIR, 'sts2-live.json'),
  eventsPath: path.join(RUNTIME_DIR, 'sts2-events.ndjson'),
  agentDir: AGENT_DIR,
  statePath: path.join(AGENT_DIR, 'screen_state.json'),
  ackPath: path.join(AGENT_DIR, 'command_ack.json'),
  commandPath: path.join(AGENT_DIR, 'command.json'),
} as const;
