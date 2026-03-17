#!/usr/bin/env node

import { buildRunSummary, printRunSummary } from './scripts/lib/run-save-summary.ts';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const fullMode = args.includes('--full');
const explicitPath = args.find((arg) => !arg.startsWith('--')) ?? null;
const summary = buildRunSummary(explicitPath);

if (jsonMode) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printRunSummary(summary, { full: fullMode });
}
