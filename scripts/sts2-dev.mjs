#!/usr/bin/env node

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const modProjectPath = path.join(repoRoot, "Sts2StateExport", "Sts2StateExport.csproj");
const adminCliPath = path.join(repoRoot, "scripts", "sts2admin.mjs");
const reloadCliPath = path.join(repoRoot, "scripts", "sts2reload.mjs");
const libDir = path.join(repoRoot, "scripts", "lib");

function usage() {
  console.log(`Usage:
  node scripts/sts2-dev.mjs build
  node scripts/sts2-dev.mjs build-no-restart
  node scripts/sts2-dev.mjs test
  node scripts/sts2-dev.mjs restart
  node scripts/sts2-dev.mjs continue
  node scripts/sts2-dev.mjs reload
`);
}

function runOrThrow(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function listTestFiles() {
  return fs.readdirSync(libDir)
    .filter((entry) => entry.endsWith(".test.mjs"))
    .sort()
    .map((entry) => path.join(libDir, entry));
}

function main() {
  const action = process.argv[2];

  switch (action) {
    case "build":
      runOrThrow("dotnet", ["build", modProjectPath]);
      runOrThrow(process.execPath, [adminCliPath, "restart"]);
      return;
    case "build-no-restart":
      runOrThrow("dotnet", ["build", modProjectPath]);
      return;
    case "test":
      runOrThrow(process.execPath, ["--test", ...listTestFiles()]);
      return;
    case "restart":
      runOrThrow(process.execPath, [adminCliPath, "restart"]);
      return;
    case "continue":
      runOrThrow(process.execPath, [reloadCliPath, "continue", "--menu"]);
      return;
    case "reload":
      runOrThrow(process.execPath, [reloadCliPath, "reload", "--menu"]);
      return;
    default:
      usage();
      process.exitCode = action ? 1 : 0;
  }
}

main();
