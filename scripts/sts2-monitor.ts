#!/usr/bin/env node

import { captureLiveStatus } from "./lib/monitor-client.ts";
import { printJson } from "./lib/json-output.ts";

async function main(): Promise<void> {
  const snapshot = await captureLiveStatus();

  printJson(snapshot);
}

await main();
