import { SPIRE_CODEX_BASE_URL } from "../config.mjs";
import { ReferenceSource } from "./base.mjs";

const DATA_FILES = ["cards", "relics", "events"];

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch '${url}': ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export class SpireCodexBootstrapSource extends ReferenceSource {
  constructor(baseUrl = SPIRE_CODEX_BASE_URL) {
    super("spire-codex-bootstrap", "bootstrap");
    this.baseUrl = baseUrl;
  }

  async load() {
    const payloads = await Promise.all(
      DATA_FILES.map(async (fileName) => {
        const url = `${this.baseUrl}/${fileName}.json`;
        return [fileName, await fetchJson(url)];
      }),
    );

    return Object.fromEntries(payloads);
  }
}
