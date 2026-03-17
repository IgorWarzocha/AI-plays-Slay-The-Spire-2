import { spawnSync } from 'node:child_process';

export function run(
  command: string,
  args: readonly string[],
  options: { allowFailure?: boolean; cwd?: string } = {},
): string {
  const result = spawnSync(command, [...args], {
    encoding: 'utf8',
    cwd: options.cwd,
  });

  if (!options.allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}.`);
  }

  return result.stdout ?? '';
}
