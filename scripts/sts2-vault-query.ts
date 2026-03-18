#!/usr/bin/env node

import fs from "node:fs";

import { RUNTIME_REFERENCE_PATH } from "/home/igorw/Work/STS2/reference/src/config.ts";
import { fileExists, readJson } from "/home/igorw/Work/STS2/reference/src/io/fs.ts";
import { searchLibrary } from "/home/igorw/Work/STS2/reference/src/query/search.ts";
import type { EntityKind, ReferenceLibrary, SearchResult } from "/home/igorw/Work/STS2/reference/src/types.ts";
import { parseArgs } from "./lib/args.ts";
import { printJson } from "./lib/json-output.ts";
import type { ParsedArgs } from "./lib/types.ts";

const VAULT_INDEX_PATH = "/home/igorw/Work/STS2/runtime/vault/index.json";

interface VaultIndexEntry {
  kind: string;
  id: string;
  path: string;
}

interface VaultIndex {
  entries: VaultIndexEntry[];
}

function usage(): void {
  console.log(`Usage:
  npm run reference:vault:query -- <query> [--kind card|relic|event|all] [--limit N] [--exact] [--json]
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

  if (!fileExists(VAULT_INDEX_PATH)) {
    throw new Error(`Vault index not found at '${VAULT_INDEX_PATH}'. Run 'npm run reference:vault:build' first.`);
  }

  const library = readJson<ReferenceLibrary>(RUNTIME_REFERENCE_PATH);
  const vaultIndex = readJson<VaultIndex>(VAULT_INDEX_PATH);
  const results = searchLibrary(library, query, {
    kind: readKindOption(options.kind),
    limit: readLimitOption(options.limit),
    exact: readBooleanOption(options.exact),
  });

  const withPages = results.map(({ entity, score }: SearchResult) => {
    const page = vaultIndex.entries.find((entry) => entry.kind === entity.kind && entry.id === entity.id) ?? null;
    return {
      entity,
      score,
      page,
      content: page ? fs.readFileSync(page.path, "utf8") : null,
    };
  });

  if (options.json) {
    printJson(withPages);
    return;
  }

  if (withPages.length === 0) {
    console.log("No matches.");
    return;
  }

  for (const result of withPages) {
    console.log(`${result.entity.kind.toUpperCase()} ${result.entity.id} (${result.score})`);
    if (result.page) {
      console.log(`Path: ${result.page.path}`);
    }
    console.log(result.content ?? "No page content.");
  }
}

main();
