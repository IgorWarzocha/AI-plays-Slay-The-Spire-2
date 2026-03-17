#!/usr/bin/env node

import {
  buildAdminStatus,
  launchGame,
  parseArgs,
  quitGame,
  readMonitorPid,
  restartGame,
  startMonitor,
  stopMonitor,
  isMonitorRunning,
} from "./lib/sts2-runtime.mjs";

function usage() {
  console.log(`Usage:
  sts2admin.mjs status
  sts2admin.mjs launch
  sts2admin.mjs quit
  sts2admin.mjs restart
  sts2admin.mjs monitor-start
  sts2admin.mjs monitor-stop
  sts2admin.mjs monitor-status
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
    case "monitor-start":
      console.log(JSON.stringify({ pid: startMonitor() }, null, 2));
      return;
    case "monitor-stop":
      console.log(JSON.stringify({ stopped: stopMonitor() }, null, 2));
      return;
    case "monitor-status":
      console.log(JSON.stringify({ running: isMonitorRunning(), pid: readMonitorPid() }, null, 2));
      return;
    default:
      usage();
      if (command) {
        process.exitCode = 1;
      }
  }
}

main();
