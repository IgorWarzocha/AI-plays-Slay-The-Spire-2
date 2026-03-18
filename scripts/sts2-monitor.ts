#!/usr/bin/env node

import { captureLiveStatus } from "./lib/monitor-client.ts";

async function main(): Promise<void> {
  const snapshot = await captureLiveStatus();

  console.log(JSON.stringify(snapshot, null, 2));
}

await main();
