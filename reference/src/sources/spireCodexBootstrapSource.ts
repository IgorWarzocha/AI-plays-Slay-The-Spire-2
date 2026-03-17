import type { BootstrapPayload } from '../types.ts';
import { SPIRE_CODEX_BASE_URL } from '../config.ts';
import { ReferenceSource } from './base.ts';

const DATA_FILES = ['cards', 'relics', 'events'] as const;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch '${url}': ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export class SpireCodexBootstrapSource extends ReferenceSource<BootstrapPayload> {
  public readonly baseUrl: string;

  constructor(baseUrl = SPIRE_CODEX_BASE_URL) {
    super('spire-codex-bootstrap', 'bootstrap');
    this.baseUrl = baseUrl;
  }

  async load(): Promise<BootstrapPayload> {
    const payloads = await Promise.all(
      DATA_FILES.map(async (fileName) => {
        const url = `${this.baseUrl}/${fileName}.json`;
        return [fileName, await fetchJson<BootstrapPayload[typeof fileName]>(url)] as const;
      }),
    );

    return Object.fromEntries(payloads) as unknown as BootstrapPayload;
  }
}
