#!/usr/bin/env node

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const modProjectPath = path.join(repoRoot, "Sts2StateExport", "Sts2StateExport.csproj");
const modDirPath = path.join(repoRoot, "Sts2StateExport");
const modManifestPath = path.join(modDirPath, "mod_manifest.json");
const modPackScriptPath = path.join(repoRoot, "tools", "pack_mod.gd");
const gameRoot = "/run/media/igorw/Steam/SteamLibrary/steamapps/common/Slay the Spire 2";
const gameExecutablePath = path.join(gameRoot, "SlayTheSpire2");
const installedModDirPath = path.join(gameRoot, "mods", "Sts2StateExport");
const installedModManifestPath = path.join(installedModDirPath, "mod_manifest.json");
const installedModPckPath = path.join(installedModDirPath, "Sts2StateExport.pck");
const adminCliPath = path.join(repoRoot, "scripts", "sts2admin.ts");
const reloadCliPath = path.join(repoRoot, "scripts", "sts2reload.ts");
const testDir = path.join(repoRoot, "scripts", "tests");

function usage(): void {
  console.log(`Usage:
  npm run build
  npm test
  npm run typecheck
  npm run check
  npm run restart
  npm run continue
  npm run reload
`);
}

function runOrThrow(command: string, args: readonly string[]): void {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function writeFile(pathname: string, contents: string): void {
  fs.mkdirSync(path.dirname(pathname), { recursive: true });
  fs.writeFileSync(pathname, contents, "utf8");
}

function packModManifest(): void {
  const tempProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), "sts2-pack-mod-"));
  const tempProjectPath = path.join(tempProjectDir, "project.godot");

  try {
    writeFile(tempProjectPath, `; Engine configuration file.\nconfig_version=5\n\n[application]\nconfig/name="pack_mod"\nrun/main_scene=""\n`);
    fs.mkdirSync(installedModDirPath, { recursive: true });

    runOrThrow(gameExecutablePath, [
      "--headless",
      "--path",
      tempProjectDir,
      "--script",
      modPackScriptPath,
      "--",
      installedModPckPath,
      modManifestPath,
      "mod_manifest.json",
    ]);
  } finally {
    fs.rmSync(tempProjectDir, { recursive: true, force: true });
  }
}

function listTestFiles(): string[] {
  return fs.readdirSync(testDir)
    .filter((entry) => entry.endsWith(".test.ts"))
    .sort()
    .map((entry) => path.join(testDir, entry));
}

function main(): void {
  const action = process.argv[2];

  switch (action) {
    case "build":
      runOrThrow("dotnet", ["build", modProjectPath]);
      packModManifest();
      runOrThrow(process.execPath, [adminCliPath, "restart"]);
      return;
    case "test":
      runOrThrow(process.execPath, ["--test", ...listTestFiles()]);
      return;
    case "typecheck":
      runOrThrow("npx", ["tsc", "-p", "tsconfig.json"]);
      return;
    case "check":
      runOrThrow("npx", ["tsc", "-p", "tsconfig.json"]);
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
