import fs from "node:fs";

import { sleep } from "./time.mjs";

function isRetryableJsonReadError(error) {
  return error instanceof SyntaxError || error?.code === "ENOENT";
}

export function readJson(filePath, { retries = 8, delayMs = 25 } = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      if (!raw.trim()) {
        throw new SyntaxError(`JSON file '${filePath}' is empty.`);
      }

      return JSON.parse(raw);
    } catch (error) {
      if (!isRetryableJsonReadError(error) || attempt === retries) {
        throw error;
      }

      lastError = error;
      sleep(delayMs);
    }
  }

  throw lastError ?? new Error(`Failed to read JSON from '${filePath}'.`);
}

export function readOptionalJson(filePath) {
  return fs.existsSync(filePath) ? readJson(filePath) : null;
}

export function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
