#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { RUNTIME_REFERENCE_PATH, RUNTIME_SOURCE_SUMMARY_PATH } from "/home/igorw/Work/STS2/reference/src/config.ts";
import { fileExists, readJson, writeJson } from "/home/igorw/Work/STS2/reference/src/io/fs.ts";
import type { BaseEntity, CardEntity, EventEntity, ReferenceLibrary, RelicEntity, SourceSummary } from "/home/igorw/Work/STS2/reference/src/types.ts";
import { printJson } from "./lib/json-output.ts";

const VAULT_DIR = "/home/igorw/Work/STS2/runtime/vault";
const INDEX_PATH = path.join(VAULT_DIR, "index.json");

type ReferenceEntity = CardEntity | RelicEntity | EventEntity;

interface VaultIndexEntry {
  kind: ReferenceEntity['kind'];
  id: string;
  name: string;
  gameId: string;
  path: string;
  relativePath: string;
  inCurrentRun: boolean;
  discovered: boolean;
}

function slugify(value: string): string {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath: string, text: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, text.endsWith("\n") ? text : `${text}\n`);
}

function renderHeader(entity: BaseEntity): string[] {
  return [
    `# ${entity.name}`,
    "",
    `- Kind: ${entity.kind}`,
    `- Game ID: ${entity.gameId}`,
    `- Canonical ID: ${entity.id}`,
    `- Source: ${entity.source}`,
    `- Discovered: ${entity.state.discovered ? "yes" : "no"}`,
    `- In current run: ${entity.state.inCurrentRun ? "yes" : "no"}`,
  ];
}

function renderCommon(entity: BaseEntity): string[] {
  return [
    "",
    "## Description",
    "",
    entity.description ?? "No description available.",
    "",
  ];
}

function renderCard(entity: CardEntity): string[] {
  return [
    "## Card Data",
    "",
    `- Color: ${entity.color ?? "?"}`,
    `- Type: ${entity.type ?? "?"}`,
    `- Rarity: ${entity.rarity ?? "?"}`,
    `- Cost: ${entity.cost ?? "?"}`,
    `- Target: ${entity.target ?? "?"}`,
    `- Upgrade: ${entity.upgrade ? JSON.stringify(entity.upgrade) : "none"}`,
    entity.keywords?.length ? `- Keywords: ${entity.keywords.join(", ")}` : "- Keywords: none",
    entity.tags?.length ? `- Tags: ${entity.tags.join(", ")}` : "- Tags: none",
    "",
  ];
}

function renderRelic(entity: RelicEntity): string[] {
  return [
    "## Relic Data",
    "",
    `- Rarity: ${entity.rarity ?? "?"}`,
    `- Pool: ${entity.pool ?? "?"}`,
    `- Flavor: ${entity.flavor ?? "none"}`,
    "",
  ];
}

function renderEvent(entity: EventEntity): string[] {
  const optionList = Array.isArray(entity.options)
    ? entity.options.map((value) => String(value))
    : [];

  return [
    "## Event Data",
    "",
    `- Type: ${entity.type ?? "?"}`,
    `- Act: ${entity.act ?? "?"}`,
    `- Epithet: ${entity.epithet ?? "none"}`,
    entity.relics?.length ? `- Related relics: ${entity.relics.join(", ")}` : "- Related relics: none",
    optionList.length ? `- Options: ${optionList.join(", ")}` : "- Options: none exported",
    "",
  ];
}

function renderAliases(entity: BaseEntity): string[] {
  return [
    "## Aliases",
    "",
    ...(entity.aliases?.map((alias) => `- ${alias}`) ?? ["- none"]),
    "",
  ];
}

function renderEntity(entity: ReferenceEntity): string {
  const lines = [
    ...renderHeader(entity),
    ...renderCommon(entity),
    ...(entity.kind === "card" ? renderCard(entity) : []),
    ...(entity.kind === "relic" ? renderRelic(entity) : []),
    ...(entity.kind === "event" ? renderEvent(entity) : []),
    ...renderAliases(entity),
  ];

  return lines.join("\n");
}

function buildEntityEntry(entity: ReferenceEntity): VaultIndexEntry {
  const dirName = `${entity.kind}s`;
  const fileName = `${slugify(entity.id)}.md`;
  const relativePath = path.join("entities", dirName, fileName);
  const absolutePath = path.join(VAULT_DIR, relativePath);

  writeText(absolutePath, renderEntity(entity));

  return {
    kind: entity.kind,
    id: entity.id,
    name: entity.name,
    gameId: entity.gameId,
    path: absolutePath,
    relativePath,
    inCurrentRun: entity.state.inCurrentRun,
    discovered: entity.state.discovered,
  };
}

function main(): void {
  if (!fileExists(RUNTIME_REFERENCE_PATH)) {
    throw new Error(`Reference library not found at '${RUNTIME_REFERENCE_PATH}'. Run 'npm run reference:build' first.`);
  }

  const library = readJson<ReferenceLibrary>(RUNTIME_REFERENCE_PATH);
  const sourceSummary = fileExists(RUNTIME_SOURCE_SUMMARY_PATH)
    ? readJson<SourceSummary>(RUNTIME_SOURCE_SUMMARY_PATH)
    : null;

  ensureDir(VAULT_DIR);

  const entries = [
    ...library.cards.map(buildEntityEntry),
    ...library.relics.map(buildEntityEntry),
    ...library.events.map(buildEntityEntry),
  ];

  const index = {
    builtAtUtc: new Date().toISOString(),
    sourceSummary,
    counts: library.metadata?.counts ?? null,
    entries,
  };

  writeJson(INDEX_PATH, index);

  printJson({
    ok: true,
    indexPath: INDEX_PATH,
    vaultDir: VAULT_DIR,
    counts: {
      entries: entries.length,
      cards: library.cards.length,
      relics: library.relics.length,
      events: library.events.length,
    },
  });
}

main();
