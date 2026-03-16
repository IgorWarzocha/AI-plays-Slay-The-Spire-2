#!/usr/bin/env node

import { RUNTIME_REFERENCE_PATH } from "/home/igorw/Work/STS2/reference/src/config.mjs";
import { fileExists, readJson } from "/home/igorw/Work/STS2/reference/src/io/fs.mjs";
import { searchLibrary } from "/home/igorw/Work/STS2/reference/src/query/search.mjs";

function parseArgs(argv) {
  const options = {};
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { positional, options };
}

function printTextResult(results) {
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

function usage() {
  console.log(`Usage:
  node /home/igorw/Work/STS2/scripts/sts2-reference-query.mjs <query> [--kind card|relic|event|all] [--limit N] [--exact] [--json]
`);
}

function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const query = positional.join(" ").trim();

  if (!query) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (!fileExists(RUNTIME_REFERENCE_PATH)) {
    throw new Error(`Reference library not found at '${RUNTIME_REFERENCE_PATH}'. Run sts2-reference-build first.`);
  }

  const library = readJson(RUNTIME_REFERENCE_PATH);
  const results = searchLibrary(library, query, {
    kind: options.kind ?? "all",
    limit: options.limit ?? 5,
    exact: options.exact ?? false,
  });

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  printTextResult(results);
}

main();
