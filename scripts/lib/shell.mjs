import { execFileSync } from "node:child_process";

export function run(command, args, { allowFailure = false } = {}) {
  try {
    return execFileSync(command, args, { encoding: "utf8" }).trim();
  } catch (error) {
    if (allowFailure) {
      return "";
    }

    throw error;
  }
}
