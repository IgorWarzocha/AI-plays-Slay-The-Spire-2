#!/usr/bin/env node

import { RUNTIME_REFERENCE_PATH } from "/home/igorw/Work/STS2/reference/src/config.ts";
import { fileExists, readJson } from "/home/igorw/Work/STS2/reference/src/io/fs.ts";
import { searchLibrary } from "/home/igorw/Work/STS2/reference/src/query/search.ts";
import type { EntityKind, ReferenceLibrary, SearchResult } from "/home/igorw/Work/STS2/reference/src/types.ts";
import { parseArgs } from "./lib/args.ts";
import type { ParsedArgs } from "./lib/types.ts";

function printTextResult(results: SearchResult[]): void {
  if (results.length === 0) {
    console.log("No matches.");
    return;
  }

  for (const { entity, score } of results) {
    console.log(`${entity.kind.toUpperCase()} ${entity.id} (${score})`);
    console.log(`  Name: ${entity.name}`);
    console.log(`  Game ID: ${entity.gameId}`);
    console.log(`  Discovered: ${entity.state.discovered}  In run: ${entity.state.inCurrentRun}`);
    if (entity.kind === "card") {
      console.log(`  Type: ${entity.type ?? "?"}  Rarity: ${entity.rarity ?? "?"}  Cost: ${entity.cost ?? "?"}`);
    } else if (entity.kind === "relic") {
      console.log(`  Rarity: ${entity.rarity ?? "?"}  Pool: ${entity.pool ?? "?"}`);
    } else if (entity.kind === "event") {
      console.log(`  Type: ${entity.type ?? "?"}  Act: ${entity.act ?? "?"}`);
    }
    console.log(`  Description: ${(entity.description ?? "").replace(/\s+/g, " ").trim()}`);
  }
}

function usage(): void {
  console.log(`Usage:
  npm run reference:query -- <query> [--kind card|relic|event|all] [--limit N] [--exact] [--json]
`);
}

function readKindOption(value: ParsedArgs['options'][string] | undefined): EntityKind | 'all' {
  return value === 'card' || value === 'relic' || value === 'event' || value === 'all' ? value : 'all';
}

function readLimitOption(value: ParsedArgs['options'][string] | undefined): number | string {
  return typeof value === 'string' || typeof value === 'number' ? value : 5;
}

function readBooleanOption(value: ParsedArgs['options'][string] | undefined): boolean {
  return value === true || value === 'true' || value === '1';
}

function main(): void {
  const { positional, options }: ParsedArgs = parseArgs(process.argv.slice(2));
  const query = positional.join(" ").trim();

  if (!query) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (!fileExists(RUNTIME_REFERENCE_PATH)) {
    throw new Error(`Reference library not found at '${RUNTIME_REFERENCE_PATH}'. Run 'npm run reference:build' first.`);
  }

  const library = readJson<ReferenceLibrary>(RUNTIME_REFERENCE_PATH);
  const results = searchLibrary(library, query, {
    kind: readKindOption(options.kind),
    limit: readLimitOption(options.limit),
    exact: readBooleanOption(options.exact),
  });

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  printTextResult(results);
}

main();
