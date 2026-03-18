#!/usr/bin/env node

import {
  buildAdminStatus,
  captureLiveStatus,
  launchGame,
  parseArgs,
  quitGame,
  restartGame,
} from "./lib/sts2-runtime.ts";

function usage() {
  console.log(`Usage:
  sts2admin.ts status
  sts2admin.ts launch
  sts2admin.ts quit
  sts2admin.ts restart
  sts2admin.ts monitor-capture
`);
}

function printStatus() {
  return buildAdminStatus().then((status) => {
    console.log(JSON.stringify(status, null, 2));
  });
}

async function main() {
  const { positional } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  switch (command) {
    case "status":
      await printStatus();
      return;
    case "launch":
      await launchGame();
      await printStatus();
      return;
    case "quit":
      await quitGame();
      await printStatus();
      return;
    case "restart":
      await restartGame();
      await printStatus();
      return;
    case "monitor-capture":
      console.log(JSON.stringify(await captureLiveStatus(), null, 2));
      return;
    default:
      usage();
      if (command) {
        process.exitCode = 1;
      }
  }
}

await main();
