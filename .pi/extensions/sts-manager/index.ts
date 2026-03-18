import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Key, Text, matchesKey } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

import {
  appendToLatestRunLog,
  buildSubagentModel,
  ensureStsManagerDataDir,
  formatLatestRunLogSummary,
  parseFrontmatter,
  readFightAgentConfig,
  readHardState,
  readLastFightReport,
  readLatestRunLog,
  runActionWithHardView,
  summarizeTopBar,
  writeLastFightReport,
  type FightKind,
} from "../../../scripts/lib/sts-fight-manager.ts";

const SUBAGENT_MODE_ENV = "PI_STS_SUBAGENT_MODE";
const SUBAGENT_KIND_ENV = "PI_STS_SUBAGENT_KIND";
const SUBAGENT_LOAD_FIGHT_ENV = "PI_STS_SUBAGENT_LOAD_FIGHT";
const SUBAGENT_PREFIGHT_STATE_ENV = "PI_STS_SUBAGENT_PREFIGHT_STATE";
const SUBAGENT_RESULT_PATH_ENV = "PI_STS_SUBAGENT_RESULT_PATH";

const MAIN_SYSTEM_APPENDIX = `
STS combat delegation is extension-owned in this repo.
- Use delegate_fight for hallway, elite, and boss combat.
- The main agent owns pathing, events, merchants, rewards, picks, long-term strategy, and guide or skill updates.
- The combat prompt files are living assets owned by the main agent: .pi/sts-agents/hallway.md, .pi/sts-agents/elite.md, and .pi/sts-agents/boss.md.
- delegate_fight requires one exact load_fight action string that would enter or load the fight from the last non-combat state.
- If an unknown node or event unexpectedly becomes a fight, stop playing manually and hand over the fight with delegate_fight. Still pass the best exact load_fight action that entered that node or fight.
- The tool itself decides whether to execute load_fight or attach to the already-loaded combat. Do not add extra parameters for that distinction.
- Do not play the fight yourself when you can delegate it with delegate_fight.
- After delegate_fight returns, you own all reward decisions and any guide/skill edits.
- Trust the subagent's reported reward-screen state after delegate_fight returns. Do not immediately re-check the same state unless something concrete is missing, ambiguous, or inconsistent.
- If a combat subagent misbehaves, oversteps ownership, ignores formatting, or produces weak summaries, tighten the responsible .pi/sts-agents/*.md prompt directly.
- Refine those prompt files incrementally and specifically: sharpen ownership boundaries, workflow steps, stop conditions, and output contract instead of bloating them.
- Subagents never edit their own prompt files; the main agent does that improvement loop.
`.trim();

const StartFightParams = Type.Object({
  fight_type: Type.Union([
    Type.Literal("hallway"),
    Type.Literal("elite"),
    Type.Literal("boss"),
  ], { description: "Which combat specialist to launch." }),
  prompt: Type.String({
    description: "Main-agent handoff prompt describing the run state, plan, and what the combat specialist should know.",
  }),
  load_fight: Type.String({
    description: "One exact action string that would enter or load the fight from the last non-combat state. If the fight is already in progress, still pass it; the tool will attach instead of replaying it.",
  }),
});

const EndFightParams = Type.Object({
  summary_output: Type.String({
    description: "The markdown floor note to append to the latest run log.",
  }),
  rewards_screen: Type.Optional(Type.String({
    description: "Optional exact action string that advances from the post-fight continue state into the visible reward screen. Leave empty only if already on the reward screen.",
  })),
});

type StartFightParamsType = {
  fight_type: FightKind;
  prompt: string;
  load_fight: string;
};

type EndFightParamsType = {
  summary_output: string;
  rewards_screen?: string;
};

interface StartFightDetails {
  fightType: FightKind;
  model: string;
  promptFile: string;
  loadFight: string;
  summary: string;
  completedAtUtc: string;
  completedFight: boolean;
  incompleteReason?: string;
  rewardAction?: string | null;
  rewardState?: string;
  logPath?: string;
  stderr?: string;
}

interface EndFightCapture {
  kind: FightKind;
  logPath: string;
  executedAction: string | null;
  rewardText: string;
}

function getLastAssistantTextFromMessages(
  messages: Array<{ role?: string; content?: Array<{ type: string; text?: string }> }> | undefined,
): string {
  if (!Array.isArray(messages)) {
    return "";
  }

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== "assistant") {
      continue;
    }

    const text = stringifyTextContent(message.content ?? []);
    if (text) {
      return text;
    }
  }

  return "";
}

function isCombatScreen(screenType: string | null | undefined): boolean {
  return screenType === "combat_room"
    || screenType === "combat_card_select"
    || screenType === "combat_choice_select";
}

function isSubagentMode(): boolean {
  return process.env[SUBAGENT_MODE_ENV] === "1";
}

function readSubagentKind(): FightKind {
  const kind = process.env[SUBAGENT_KIND_ENV];
  if (kind === "hallway" || kind === "elite" || kind === "boss") {
    return kind;
  }
  throw new Error(`Invalid or missing ${SUBAGENT_KIND_ENV}.`);
}

function readSubagentLoadFight(): string {
  const action = process.env[SUBAGENT_LOAD_FIGHT_ENV]?.trim();
  if (!action) {
    throw new Error(`Missing ${SUBAGENT_LOAD_FIGHT_ENV}.`);
  }
  return action;
}

function readPrefightStateText(): string {
  return process.env[SUBAGENT_PREFIGHT_STATE_ENV] ?? "(prefight state unavailable)";
}

function stringifyTextContent(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

function writePromptToTempFile(prefix: string, body: string): { dir: string; filePath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sts-fight-${prefix}-`));
  const filePath = path.join(dir, `${prefix}.md`);
  fs.writeFileSync(filePath, body, "utf8");
  return { dir, filePath };
}

async function spawnFightSubagent(
  params: StartFightParamsType,
  signal: AbortSignal | undefined,
): Promise<{
  summary: string;
  stderr: string;
  model: string;
  loadFight: string;
  endFight: EndFightCapture | null;
  sawAgentEnd: boolean;
  exitCode: number;
}> {
  const config = readFightAgentConfig(params.fight_type);
  const model = buildSubagentModel(config);
  const prefightState = await readHardState();
  const loadFight = params.load_fight.trim();

  if (!loadFight) {
    throw new Error("delegate_fight requires load_fight.");
  }

  const { dir, filePath } = writePromptToTempFile(params.fight_type, config.promptBody);
  const resultPath = path.join(dir, "end-fight-result.json");

  const args = [
    "--mode", "json",
    "-p",
    "--no-session",
    "--model", model,
    "--append-system-prompt", filePath,
    params.prompt,
  ];

  try {
    const childEnv = {
      ...process.env,
      [SUBAGENT_MODE_ENV]: "1",
      [SUBAGENT_KIND_ENV]: params.fight_type,
      [SUBAGENT_LOAD_FIGHT_ENV]: loadFight,
      [SUBAGENT_PREFIGHT_STATE_ENV]: prefightState.text,
      [SUBAGENT_RESULT_PATH_ENV]: resultPath,
    };

    const result = await new Promise<{ exitCode: number; summary: string; stderr: string; sawAgentEnd: boolean }>((resolve) => {
      const proc = spawn("pi", args, {
        cwd: process.cwd(),
        env: childEnv,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdoutBuffer = "";
      let stderr = "";
      let lastAssistantText = "";
      let sawAgentEnd = false;
      let settled = false;

      const finish = (exitCode: number) => {
        if (settled) return;
        settled = true;
        resolve({ exitCode, summary: lastAssistantText.trim(), stderr: stderr.trim(), sawAgentEnd });
      };

      const processLine = (line: string) => {
        if (!line.trim()) return;
        try {
          const event = JSON.parse(line) as {
            type?: string;
            message?: {
              role?: string;
              content?: Array<{ type: string; text?: string }>;
            };
            messages?: Array<{ role?: string; content?: Array<{ type: string; text?: string }> }>;
          };

          if (event.type === "message_end" && event.message?.role === "assistant") {
            const text = stringifyTextContent(event.message.content ?? []);
            if (text) {
              lastAssistantText = text;
            }
          }

          if (event.type === "agent_end") {
            sawAgentEnd = true;
            const text = getLastAssistantTextFromMessages(event.messages);
            if (text) {
              lastAssistantText = text;
            }
          }
        } catch {
          // ignore malformed json lines from child output
        }
      };

      proc.stdout.on("data", (chunk) => {
        stdoutBuffer += chunk.toString();
        const lines = stdoutBuffer.split("\n");
        stdoutBuffer = lines.pop() ?? "";
        for (const line of lines) processLine(line);
      });

      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      proc.on("error", (error) => {
        stderr += String(error);
        finish(1);
      });

      proc.on("close", (code) => {
        if (stdoutBuffer.trim()) {
          processLine(stdoutBuffer);
        }
        finish(code ?? 0);
      });

      if (signal) {
        const abortChild = () => {
          proc.kill("SIGTERM");
          setTimeout(() => {
            if (!proc.killed) proc.kill("SIGKILL");
          }, 5000);
        };

        if (signal.aborted) abortChild();
        else signal.addEventListener("abort", abortChild, { once: true });
      }
    });

    let endFight: EndFightCapture | null = null;
    if (fs.existsSync(resultPath)) {
      try {
        endFight = JSON.parse(fs.readFileSync(resultPath, "utf8")) as EndFightCapture;
      } catch {
        endFight = null;
      }
    }

    if (result.exitCode !== 0 && !endFight && !result.summary && !result.sawAgentEnd) {
      throw new Error(result.stderr || `Fight subagent exited with code ${result.exitCode}.`);
    }

    return {
      summary: result.summary || "(No final assistant summary captured.)",
      stderr: result.stderr,
      model,
      loadFight,
      endFight,
      sawAgentEnd: result.sawAgentEnd,
      exitCode: result.exitCode,
    };
  } finally {
    try {
      fs.unlinkSync(filePath);
    } catch {}
    try {
      fs.rmdirSync(dir);
    } catch {}
  }
}

function buildBootstrapMessage(kind: FightKind, loadFight: string, prefightState: string, bootstrappedState: string, attached: boolean): string {
  return [
    attached
      ? `STS ${kind} delegated by attaching to the already-loaded combat.`
      : `STS ${kind} bootstrap executed programmatically before your first turn.`,
    "",
    `load_fight action: ${loadFight}`,
    "",
    attached ? "Hard state at handoff:" : "Prefight hard state before load_fight:",
    prefightState,
    "",
    attached ? "Bootstrapped combat hard state:" : "Hard state after load_fight:",
    bootstrappedState,
    "",
    formatLatestRunLogSummary(),
  ].join("\n");
}

function buildCompactFightResult(details: StartFightDetails): string[] {
  return [
    `${details.completedFight ? "✓" : "!"} ${details.fightType} fight delegated via ${details.model}`,
    `load_fight: ${details.loadFight}`,
    `reward action: ${details.rewardAction ?? "none"}`,
    truncate(details.summary.replace(/\s+/g, " "), 160),
  ];
}

function registerFightDelegationTool(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "delegate_fight",
    label: "Delegate Fight",
    description: "Delegate one hallway, elite, or boss fight to the configured disposable combat subagent. Always pass load_fight; the tool decides whether to execute it or attach to current combat.",
    parameters: StartFightParams,
    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      const startParams = params as StartFightParamsType;
      const outcome = await spawnFightSubagent(startParams, signal);
      const incompleteReason = outcome.endFight
        ? undefined
        : (outcome.sawAgentEnd
            ? "The subagent ended its turn without calling end_fight."
            : (outcome.exitCode !== 0
                ? `The subagent exited early with code ${outcome.exitCode}.`
                : "The subagent did not produce an end_fight handoff."));
      const details: StartFightDetails = {
        fightType: startParams.fight_type,
        model: outcome.model,
        promptFile: readFightAgentConfig(startParams.fight_type).filePath,
        loadFight: outcome.loadFight,
        summary: outcome.summary,
        completedAtUtc: new Date().toISOString(),
        completedFight: Boolean(outcome.endFight),
        ...(incompleteReason ? { incompleteReason } : {}),
        ...(outcome.endFight ? {
          rewardAction: outcome.endFight.executedAction,
          rewardState: outcome.endFight.rewardText,
          logPath: outcome.endFight.logPath,
        } : {}),
        ...(outcome.stderr ? { stderr: outcome.stderr } : {}),
      };

      writeLastFightReport(details);

      return {
        content: [{
          type: "text",
          text: [
            outcome.endFight
              ? "## Delegate Status\n- Fight handoff completed via end_fight."
              : [
                  "## Delegate Status",
                  `- ${incompleteReason ?? "The fight handoff is incomplete."}`,
                  "- The final assistant message from the subagent is included below.",
                ].join("\n"),
            "",
            outcome.summary,
            outcome.endFight
              ? [
                  "",
                  "## End Fight Tool Output",
                  `- Reward transition action: ${outcome.endFight.executedAction ?? "none"}`,
                  `- Run log path: ${outcome.endFight.logPath}`,
                  "",
                  "## Reward Screen Hard State",
                  outcome.endFight.rewardText,
                ].join("\n")
              : "",
          ].filter(Boolean).join("\n"),
        }],
        isError: !outcome.endFight,
        details,
      };
    },
    renderCall(args, theme) {
      return new Text(
        `${theme.fg("toolTitle", theme.bold("delegate_fight "))}${theme.fg("accent", args.fight_type ?? "fight")}`,
        0,
        0,
      );
    },
    renderResult(result, options, theme) {
      const details = result.details as StartFightDetails | undefined;
      if (!details) {
        return new Text(theme.fg("warning", truncate(stringifyTextContent(result.content as Array<{ type: string; text?: string }>), 160)), 0, 0);
      }

      if (!options.expanded) {
        return new Text(`${buildCompactFightResult(details).join("\n")}\n${theme.fg("dim", "Ctrl+O for full result")}`, 0, 0);
      }

      const fullText = stringifyTextContent(result.content as Array<{ type: string; text?: string }>) || details.summary;
      const lines = [
        details.completedFight
          ? theme.fg("success", `Fight delegated: ${details.fightType}`)
          : theme.fg("warning", `Fight delegation incomplete: ${details.fightType}`),
        `Model: ${details.model}`,
        `Prompt file: ${details.promptFile}`,
        `load_fight: ${details.loadFight}`,
        `reward action: ${details.rewardAction ?? "none"}`,
        "",
        fullText,
      ];
      if (details.incompleteReason) {
        lines.splice(5, 0, theme.fg("warning", details.incompleteReason), "");
      }
      if (details.stderr) {
        lines.push("", theme.fg("warning", `stderr: ${details.stderr}`));
      }
      return new Text(lines.join("\n"), 0, 0);
    },
  });
}

async function editAgentFile(kind: FightKind, ctx: Parameters<NonNullable<ExtensionAPI["registerCommand"]>>[1]["handler"] extends (args: string, ctx: infer T) => any ? T : never): Promise<void> {
  const config = readFightAgentConfig(kind);
  const updated = await ctx.ui.editor(`Edit ${kind} fight agent`, config.raw);
  if (updated === undefined) {
    return;
  }

  const parsed = parseFrontmatter(updated);
  if (!parsed.frontmatter.provider?.trim()) {
    ctx.ui.notify(`Missing provider in ${config.filePath}`, "error");
    return;
  }
  if (!parsed.frontmatter.model?.trim()) {
    ctx.ui.notify(`Missing model in ${config.filePath}`, "error");
    return;
  }
  if (!parsed.body.trim()) {
    ctx.ui.notify(`Missing prompt body in ${config.filePath}`, "error");
    return;
  }

  fs.writeFileSync(config.filePath, updated.endsWith("\n") ? updated : `${updated}\n`, "utf8");
  ctx.ui.notify(`Saved ${kind} fight agent`, "info");
}

async function openReadOnlyEditor(title: string, text: string, ctx: Parameters<NonNullable<ExtensionAPI["registerCommand"]>>[1]["handler"] extends (args: string, ctx: infer T) => any ? T : never): Promise<void> {
  await ctx.ui.editor(title, text);
}

async function openManager(ctx: Parameters<NonNullable<ExtensionAPI["registerCommand"]>>[1]["handler"] extends (args: string, ctx: infer T) => any ? T : never): Promise<void> {
  const actions = [
    { id: "refresh", label: "Refresh live state" },
    { id: "edit-hallway", label: "Edit hallway fight subagent" },
    { id: "edit-elite", label: "Edit elite fight subagent" },
    { id: "edit-boss", label: "Edit boss fight subagent" },
    { id: "view-report", label: "View last combat report" },
    { id: "view-log", label: "View latest run log excerpt" },
    { id: "close", label: "Close" },
  ] as const;

  while (true) {
    const state = await readHardState().catch(() => ({ state: null, view: null, text: "State unavailable" }));
    const configs = [readFightAgentConfig("hallway"), readFightAgentConfig("elite"), readFightAgentConfig("boss")];

    const choice = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
      let index = 0;
      const linesCache = { value: [] as string[] | null };

      const render = (width: number): string[] => {
        if (linesCache.value) return linesCache.value;
        const lines: string[] = [];
        lines.push(theme.fg("accent", theme.bold("STS Fight Manager")));
        lines.push("");
        lines.push(`State: ${summarizeTopBar(state.state)}`);
        lines.push("");
        lines.push(theme.bold("Combat subagents"));
        for (const config of configs) {
          const model = buildSubagentModel(config);
          lines.push(`- ${config.kind}: ${model}`);
        }
        lines.push("");
        lines.push(theme.bold("Actions"));
        actions.forEach((action, actionIndex) => {
          const prefix = actionIndex == index ? theme.fg("accent", "> ") : "  ";
          lines.push(`${prefix}${action.label}`);
        });
        lines.push("");
        lines.push(theme.fg("dim", "↑↓ move • Enter select • Esc close"));
        linesCache.value = lines.map((line) => truncate(line, Math.max(10, width)));
        return linesCache.value;
      };

      return {
        render(width: number) {
          return render(width);
        },
        invalidate() {
          linesCache.value = null;
        },
        handleInput(data: string) {
          if (matchesKey(data, Key.up)) {
            index = Math.max(0, index - 1);
            linesCache.value = null;
            tui.requestRender();
            return;
          }
          if (matchesKey(data, Key.down)) {
            index = Math.min(actions.length - 1, index + 1);
            linesCache.value = null;
            tui.requestRender();
            return;
          }
          if (matchesKey(data, Key.enter)) {
            done(actions[index]?.id ?? null);
            return;
          }
          if (matchesKey(data, Key.escape)) {
            done(null);
          }
        },
      };
    }, { overlay: true });

    if (!choice || choice === "close") {
      return;
    }

    if (choice === "refresh") {
      ctx.ui.notify("State refreshed", "info");
      continue;
    }
    if (choice === "edit-hallway") {
      await editAgentFile("hallway", ctx);
      continue;
    }
    if (choice === "edit-elite") {
      await editAgentFile("elite", ctx);
      continue;
    }
    if (choice === "edit-boss") {
      await editAgentFile("boss", ctx);
      continue;
    }
    if (choice === "view-report") {
      await openReadOnlyEditor("Last combat report", readLastFightReport() ?? "No combat report recorded yet.", ctx);
      continue;
    }
    if (choice === "view-log") {
      let text = "Latest run log unavailable.";
      try {
        const latest = readLatestRunLog(6000);
        text = `Latest run log: ${latest.path}\n\n${latest.tail}`;
      } catch (error: unknown) {
        text = error instanceof Error ? error.message : String(error);
      }
      await openReadOnlyEditor("Latest run log excerpt", text, ctx);
    }
  }
}

export default function registerStsFightManager(pi: ExtensionAPI): void {
  ensureStsManagerDataDir();

  if (!isSubagentMode()) {
    pi.on("before_agent_start", async (event) => ({
      systemPrompt: `${event.systemPrompt}\n\n${MAIN_SYSTEM_APPENDIX}`,
    }));

    pi.registerCommand("sts", {
      description: "Open the STS fight manager",
      handler: async (_args, ctx) => {
        if (!ctx.hasUI) {
          ctx.ui.notify("/sts requires interactive mode", "error");
          return;
        }
        await openManager(ctx);
      },
    });

    registerFightDelegationTool(pi);

    return;
  }

  const subagentKind = readSubagentKind();
  const bootstrapAction = readSubagentLoadFight();
  const prefightStateText = readPrefightStateText();
  let bootstrapInjected = false;

  pi.on("before_agent_start", async () => {
    if (bootstrapInjected) {
      return undefined;
    }
    bootstrapInjected = true;
    const current = await readHardState();
    const attached = isCombatScreen(current.state?.screenType);
    const bootstrapped = attached
      ? {
          state: current.state,
          view: current.view,
          text: current.text,
          resolvedAction: bootstrapAction,
        }
      : await runActionWithHardView(bootstrapAction);
    return {
      message: {
        customType: "sts-fight-bootstrap",
        content: buildBootstrapMessage(subagentKind, bootstrapped.resolvedAction, prefightStateText, bootstrapped.text, attached),
        display: false,
      },
    };
  });

  pi.registerTool({
    name: "end_fight",
    label: "End Fight",
    description: "Append the prepared run-log entry to the latest run log, optionally advance to the visible reward screen, and return the resulting hard state.",
    parameters: EndFightParams,
    async execute(_toolCallId, params) {
      const endParams = params as EndFightParamsType;
      const current = await readHardState();
      let rewardText = current.text;
      let executedAction: string | null = null;

      const rewardAction = endParams.rewards_screen?.trim()
        || (current.state?.screenType === "rewards_screen" ? "" : "proceed");

      if (rewardAction) {
        const next = await runActionWithHardView(rewardAction);
        rewardText = next.text;
        executedAction = next.resolvedAction;
      }

      const appended = appendToLatestRunLog(endParams.summary_output);

      const resultPath = process.env[SUBAGENT_RESULT_PATH_ENV];
      if (resultPath) {
        try {
          fs.writeFileSync(resultPath, JSON.stringify({
            kind: subagentKind,
            logPath: appended.path,
            executedAction,
            rewardText,
          }, null, 2));
        } catch {
          // best effort only
        }
      }

      return {
        content: [{
          type: "text",
          text: [
            `Latest run log appended: ${appended.path}`,
            executedAction ? `Reward transition action: ${executedAction}` : "Reward transition action: none",
            "",
            "Reward screen hard state:",
            rewardText,
          ].join("\n"),
        }],
        details: {
          kind: subagentKind,
          logPath: appended.path,
          executedAction,
        },
      };
    },
  });
}
