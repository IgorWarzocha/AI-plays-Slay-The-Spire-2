import { run } from "./shell.mjs";
import { STS2_RUNTIME_PATHS } from "./runtime-paths.mjs";

export function getWindow() {
  const output = run("hyprctl", ["clients", "-j"], { allowFailure: true });
  if (!output) {
    return null;
  }

  const clients = JSON.parse(output);
  return clients.find(
    (client) => client.class === STS2_RUNTIME_PATHS.gameClass || client.title === STS2_RUNTIME_PATHS.gameClass,
  ) ?? null;
}

export function isRunning() {
  return Boolean(getWindow());
}
