#!/usr/bin/env node

import { captureLiveStatus } from "./lib/monitor-client.ts";

function main(): void {
  const snapshot = captureLiveStatus();

  console.log(JSON.stringify(snapshot, null, 2));
}

main();
