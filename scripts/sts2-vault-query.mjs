#!/usr/bin/env node

import fs from "node:fs";

import { RUNTIME_REFERENCE_PATH } from "/home/igorw/Work/STS2/reference/src/config.mjs";
import { fileExists, readJson } from "/home/igorw/Work/STS2/reference/src/io/fs.mjs";
import { searchLibrary } from "/home/igorw/Work/STS2/reference/src/query/search.mjs";

const VAULT_INDEX_PATH = "/home/igorw/Work/STS2/runtime/vault/index.json";

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

function usage() {
  console.log(`Usage:
  npm run reference:vault:query -- <query> [--kind card|relic|event|all] [--limit N] [--exact] [--json]
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
    throw new Error(`Reference library not found at '${RUNTIME_REFERENCE_PATH}'. Run 'npm run reference:build' first.`);
  }

  if (!fileExists(VAULT_INDEX_PATH)) {
    throw new Error(`Vault index not found at '${VAULT_INDEX_PATH}'. Run 'npm run reference:vault:build' first.`);
  }

  const library = readJson(RUNTIME_REFERENCE_PATH);
  const vaultIndex = readJson(VAULT_INDEX_PATH);
  const results = searchLibrary(library, query, {
    kind: options.kind ?? "all",
    limit: options.limit ?? 5,
    exact: options.exact ?? false,
  });

  const withPages = results.map(({ entity, score }) => {
    const page = vaultIndex.entries.find((entry) => entry.kind === entity.kind && entry.id === entity.id) ?? null;
    return {
      entity,
      score,
      page,
      content: page ? fs.readFileSync(page.path, "utf8") : null,
    };
  });

  if (options.json) {
    console.log(JSON.stringify(withPages, null, 2));
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
