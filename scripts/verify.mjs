#!/usr/bin/env node
/**
 * Pre-PR gate with live phase banners. Streams each step to the terminal.
 * Keep npm run check:agent for in-chat checks.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Run npm via node + npm-cli.js so Windows never needs shell:true + args (DEP0190). */
function resolveNpmCli() {
  const execDir = path.dirname(process.execPath);
  const candidates = [
    // Windows / some official installs: node_modules beside the binary
    path.join(execDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    // nvm / fnm / many Unix installs: lib/node_modules beside bin/
    path.join(
      path.dirname(execDir),
      'lib',
      'node_modules',
      'npm',
      'bin',
      'npm-cli.js',
    ),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Could not resolve npm CLI. Tried:\n${candidates.map((c) => `  - ${c}`).join('\n')}`,
  );
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
