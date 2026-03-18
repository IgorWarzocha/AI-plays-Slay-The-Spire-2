#!/usr/bin/env node

import { buildRunSummary, printRunSummary } from './scripts/lib/run-save-summary.ts';
import { printJson } from './scripts/lib/json-output.ts';

function abbreviateNodeType(type: string | null | undefined): string {
  switch (String(type ?? '').toLowerCase()) {
    case 'monster':
      return 'M';
    case 'unknown':
      return '?';
    case 'elite':
      return 'E';
    case 'rest_site':
    case 'restsite':
      return 'R';
    case 'shop':
      return '$';
    case 'treasure':
      return 'T';
    case 'boss':
      return 'B';
    case 'ancient':
      return 'A';
    default:
      return String(type ?? '?');
  }
}

const args = process.argv.slice(2);
const fullMode = args.includes('--full');
const explicitPath = args.find((arg) => !arg.startsWith('--')) ?? null;
const summary = buildRunSummary(explicitPath);

if (fullMode) {
  printRunSummary(summary, { full: true });
} else {
  printJson({
    floor: summary.position.currentFloor,
    boss: summary.act.bossShortId ?? summary.act.bossId,
    currentNode: summary.position.currentNode,
    immediateOptions: summary.position.routeOptions.map((option) => ({
      action: `map.travel:${option.start.coord.col},${option.start.coord.row}`,
      start: option.start,
      paths: option.previews.map((preview) => ({
        counts: preview.counts,
        summary: preview.path
          .map((node) => `${abbreviateNodeType(node.type)}@${node.coord.col},${node.coord.row}`)
          .join(' -> '),
      })),
    })),
  });
}
