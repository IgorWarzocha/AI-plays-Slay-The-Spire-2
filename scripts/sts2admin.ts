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
  console.log(JSON.stringify(buildAdminStatus(), null, 2));
}

function main() {
  const { positional } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  switch (command) {
    case "status":
      printStatus();
      return;
    case "launch":
      launchGame();
      printStatus();
      return;
    case "quit":
      quitGame();
      printStatus();
      return;
    case "restart":
      restartGame();
      printStatus();
      return;
    case "monitor-capture":
      console.log(JSON.stringify(captureLiveStatus(), null, 2));
      return;
    default:
      usage();
      if (command) {
        process.exitCode = 1;
      }
  }
}

main();
