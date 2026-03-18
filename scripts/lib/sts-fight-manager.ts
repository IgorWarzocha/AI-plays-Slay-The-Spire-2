import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCompactJson } from './json-output.ts';
import { readDisplayState, sendAction } from './sts2-runtime.ts';
import { buildCombatView, buildGameplayView } from './sts2-game-view.ts';
import type { DisplayState } from './types.ts';

export type FightKind = 'hallway' | 'elite' | 'boss';
export type ReasoningLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export interface FightAgentConfig {
  kind: FightKind;
  filePath: string;
  provider: string;
  model: string;
  reasoning: ReasoningLevel | '';
  promptBody: string;
  raw: string;
}

export interface LatestRunLogInfo {
  path: string;
  content: string;
  tail: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const STS_PROJECT_ROOT = path.resolve(__dirname, '../..');
export const STS_AGENT_DIR = path.join(STS_PROJECT_ROOT, '.pi', 'sts-agents');
export const STS_DATA_DIR = path.join(STS_PROJECT_ROOT, '.pi', 'sts-data');
export const STS_LAST_REPORT_PATH = path.join(STS_DATA_DIR, 'last-fight-report.json');
export const STS_RUN_LOG_DIR = path.join(STS_PROJECT_ROOT, 'vault', 'runs');

const FIGHT_AGENT_FILES: Record<FightKind, string> = {
  hallway: 'hallway.md',
  elite: 'elite.md',
  boss: 'boss.md',
};

function parseFrontmatter(markdown: string): { frontmatter: Record<string, string>; body: string } {
  const normalized = markdown.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { frontmatter: {}, body: markdown.trim() };
  }

  const closingIndex = normalized.indexOf('\n---\n', 4);
  if (closingIndex === -1) {
    return { frontmatter: {}, body: markdown.trim() };
  }

  const frontmatterBlock = normalized.slice(4, closingIndex).trim();
  const body = normalized.slice(closingIndex + 5).trim();
  const frontmatter: Record<string, string> = {};

  for (const line of frontmatterBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

export function getFightAgentFilePath(kind: FightKind): string {
  return path.join(STS_AGENT_DIR, FIGHT_AGENT_FILES[kind]);
}

export function readFightAgentConfig(kind: FightKind): FightAgentConfig {
  const filePath = getFightAgentFilePath(kind);
  const raw = fs.readFileSync(filePath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(raw);
  const provider = frontmatter.provider?.trim();
  const model = frontmatter.model?.trim();
  const reasoning = (frontmatter.reasoning?.trim() ?? '') as ReasoningLevel | '';

  if (!provider) {
    throw new Error(`Missing 'provider' in ${filePath}.`);
  }
  if (!model) {
    throw new Error(`Missing 'model' in ${filePath}.`);
  }
  if (!body) {
    throw new Error(`Missing prompt body in ${filePath}.`);
  }

  return {
    kind,
    filePath,
    provider,
    model,
    reasoning,
    promptBody: body,
    raw,
  };
}

export function readAllFightAgentConfigs(): FightAgentConfig[] {
  return (['hallway', 'elite', 'boss'] as const).map(readFightAgentConfig);
}

export function buildSubagentModel(config: Pick<FightAgentConfig, 'provider' | 'model' | 'reasoning'>): string {
  const base = config.model.includes('/') ? config.model : `${config.provider}/${config.model}`;
  if (!config.reasoning) return base;
  if (base.includes(':')) return base;
  return `${base}:${config.reasoning}`;
}

export function selectLatestMarkdownFile(files: readonly { path: string; mtimeMs: number }[]): string | null {
  if (files.length === 0) return null;

  const sorted = [...files].sort((left, right) => {
    if (right.mtimeMs !== left.mtimeMs) {
      return right.mtimeMs - left.mtimeMs;
    }
    return right.path.localeCompare(left.path);
  });

  return sorted[0]?.path ?? null;
}

export function getLatestRunLogPath(runLogDir: string = STS_RUN_LOG_DIR): string {
  const entries = fs.readdirSync(runLogDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => {
      const filePath = path.join(runLogDir, entry.name);
      return {
        path: filePath,
        mtimeMs: fs.statSync(filePath).mtimeMs,
      };
    });

  const latestPath = selectLatestMarkdownFile(entries);
  if (!latestPath) {
    throw new Error(`No run log markdown files found in ${runLogDir}.`);
  }

  return latestPath;
}

export function readLatestRunLog(maxChars: number = 4000): LatestRunLogInfo {
  const latestPath = getLatestRunLogPath();
  const content = fs.readFileSync(latestPath, 'utf8');
  const tail = content.length <= maxChars ? content : content.slice(-maxChars);
  return { path: latestPath, content, tail };
}

export function appendToLatestRunLog(text: string): { path: string; appendedText: string } {
  const latestPath = getLatestRunLogPath();
  const normalized = text.trim();
  if (!normalized) {
    throw new Error('Cannot append an empty run log entry.');
  }

  const prefix = fs.readFileSync(latestPath, 'utf8').endsWith('\n') ? '' : '\n';
  const appendedText = `${prefix}${normalized}\n`;
  fs.appendFileSync(latestPath, appendedText, 'utf8');
  return { path: latestPath, appendedText };
}

export function ensureStsManagerDataDir(): void {
  fs.mkdirSync(STS_DATA_DIR, { recursive: true });
}

export function writeLastFightReport(report: unknown): void {
  ensureStsManagerDataDir();
  fs.writeFileSync(STS_LAST_REPORT_PATH, `${toCompactJson(report)}\n`, 'utf8');
}

export function readLastFightReport(): string | null {
  if (!fs.existsSync(STS_LAST_REPORT_PATH)) {
    return null;
  }
  return fs.readFileSync(STS_LAST_REPORT_PATH, 'utf8');
}

export function buildHardView(state: DisplayState | null | undefined): unknown {
  if (!state) {
    return { screenType: null, updatedAtUtc: null };
  }

  if (state.screenType === 'combat_room'
    || state.screenType === 'combat_card_select'
    || state.screenType === 'combat_choice_select') {
    return buildCombatView(state, { hard: true });
  }

  return buildGameplayView(state, { hard: true });
}

export function buildHardViewText(state: DisplayState | null | undefined): string {
  return toCompactJson(buildHardView(state));
}

export async function readHardState(): Promise<{ state: DisplayState | null; view: unknown; text: string }> {
  const state = await readDisplayState();
  const view = buildHardView(state);
  return {
    state,
    view,
    text: toCompactJson(view),
  };
}

export async function runActionWithHardView(action: string): Promise<{
  state: DisplayState | null;
  view: unknown;
  text: string;
  resolvedAction: string;
}> {
  const result = await sendAction(action, {});
  const state = result.state ?? await readDisplayState();
  const view = buildHardView(state);
  return {
    state,
    view,
    text: toCompactJson(view),
    resolvedAction: result.resolvedAction ?? action,
  };
}

export function summarizeTopBar(state: DisplayState | null | undefined): string {
  if (!state?.topBar) {
    return 'screen: unknown';
  }

  const hp = state.topBar.currentHp == null || state.topBar.maxHp == null
    ? 'hp ?'
    : `hp ${state.topBar.currentHp}/${state.topBar.maxHp}`;
  const gold = state.topBar.gold == null ? 'gold ?' : `gold ${state.topBar.gold}`;
  return `${state.screenType ?? 'unknown'} • ${hp} • ${gold}`;
}

export function formatLatestRunLogSummary(): string {
  try {
    const latest = readLatestRunLog(1200);
    return `Latest run log: ${latest.path}\n\n${latest.tail}`;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return `Latest run log unavailable: ${message}`;
  }
}

export { parseFrontmatter };
