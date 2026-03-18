#!/usr/bin/env node

import { buildRunSummary, printRunSummary } from './scripts/lib/run-save-summary.ts';
import { printJson } from './scripts/lib/json-output.ts';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const fullMode = args.includes('--full');
const explicitPath = args.find((arg) => !arg.startsWith('--')) ?? null;
const summary = buildRunSummary(explicitPath);

if (jsonMode) {
  printJson(summary);
} else {
  printRunSummary(summary, { full: fullMode });
}
