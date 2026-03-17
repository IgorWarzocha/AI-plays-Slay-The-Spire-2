import os from "node:os";
import path from "node:path";

export const REPO_ROOT = "/home/igorw/Work/STS2";
export const RUNTIME_REFERENCE_PATH = path.join(REPO_ROOT, "runtime", "reference-library.json");
export const RUNTIME_SOURCE_SUMMARY_PATH = path.join(REPO_ROOT, "runtime", "reference-source-summary.json");
export const SCHEMA_VERSION = "1.0.0";

export const SPIRE_CODEX_BASE_URL =
  process.env.STS2_REFERENCE_BOOTSTRAP_BASE_URL
  ?? "https://raw.githubusercontent.com/ptrlrd/spire-codex/main/data/eng";

export const LOCAL_STS2_DIR = path.join(os.homedir(), ".local", "share", "SlayTheSpire2");
