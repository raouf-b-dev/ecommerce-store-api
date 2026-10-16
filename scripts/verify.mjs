#!/usr/bin/env node
/**
 * Pre-PR gate with live phase banners. Streams each step to the terminal.
 * Keep npm run check:agent for in-chat checks.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Run npm via node + npm-cli.js so Windows never needs shell:true + args (DEP0190). */
function resolveNpmCli() {
  const npmExecPath = process.env.npm_execpath;
  if (!npmExecPath) {
    process.stderr.write(
      'scripts/verify.mjs must be run via `npm run verify` (npm_execpath is unset).\n',
    );
    process.exit(1);
  }
  return npmExecPath;
}

const npmCli = resolveNpmCli();

const phases = [
  ['typecheck', ['run', 'typecheck']],
  ['lint:check', ['run', 'lint:check']],
  ['format:check', ['run', 'format:check']],
  ['test:arch', ['run', 'test:arch']],
  ['test', ['test']],
];

for (const [label, args] of phases) {
  process.stdout.write(`==> ${label}\n`);
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  const code = result.status ?? 1;
  if (code !== 0) {
    process.stdout.write(`==> verify failed at ${label}\n`);
    process.exit(code);
  }
}

process.stdout.write('==> verify ok\n');
