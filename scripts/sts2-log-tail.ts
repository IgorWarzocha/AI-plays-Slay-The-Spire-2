#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { parseArgs } from "./lib/args.ts";
import type { ParsedArgs } from "./lib/types.ts";

const LOG_PATH = path.join(os.homedir(), ".local", "share", "SlayTheSpire2", "logs", "godot.log");
const DEFAULT_PATTERNS = [
  /\[Sts2StateExport\]/,
  /Player 1 playing card/,
  /Player 1 chose cards/,
  /Monster .* performing move/,
  /Creating NCombatRoom/,
  /Obtained /,
  /Card reward selected/,
  /Preloading '/,
  /No player or pet creature found/,
];

function readTail(filePath: string, byteLimit: number): string {
  const stat = fs.statSync(filePath);
  const start = Math.max(0, stat.size - byteLimit);
  const fd = fs.openSync(filePath, "r");

  try {
    const buffer = Buffer.alloc(stat.size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    return buffer.toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function main(): void {
  const { options }: ParsedArgs = parseArgs(process.argv.slice(2));
  const bytes = Number(options.bytes ?? 32768);
  const regex = options.regex ? new RegExp(String(options.regex), "i") : null;

  if (!fs.existsSync(LOG_PATH)) {
    throw new Error(`Missing log file: ${LOG_PATH}`);
  }

  const text = readTail(LOG_PATH, bytes);
  const lines = text
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => {
      if (regex) {
        return regex.test(line);
      }

      return DEFAULT_PATTERNS.some((pattern) => pattern.test(line));
    });

  process.stdout.write(`${lines.join("\n")}\n`);
}

main();
