#!/usr/bin/env node
/**
 * In-chat check. Scope is the worktree plus commits on this branch since
 * the integration base. A pass is one summary. A failure starts at the
 * first error. npm run verify stays in your terminal, before a PR.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { failureExcerpt, listRepoChanges, runQuiet, selectVitestCommands } from './agent-output.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kind = 'api';
const bases = ['origin/develop', 'develop'];

if (isDirect()) main();

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const scope = listRepoChanges(root, bases);
  if (scope.files.length === 0) {
    finish(0, [
      'agent-check: skipped',
      'reason: no changes in the worktree or on this branch',
      `base: ${scope.base}`,
      'you run: npm run verify',
    ]);
  }

  const existing = scope.files.filter((file) => fs.existsSync(path.join(root, file)));
  const missing = scope.files.length - existing.length;
  const plan = selectVitestCommands(scope.files, existing, kind);
  const commands = [];
  if (scope.files.some((file) => /^scripts\/agent-/.test(file))) {
    commands.push(['agent-check tests', 'node --test scripts/agent-check.spec.mjs']);
  }
  commands.push(...plan.commands);

  const lines = [
    'agent-check: plan',
    `changed: ${scope.files.length} file(s)${missing ? `, ${missing} deleted` : ''}`,
    `scope: worktree ${scope.worktree}, branch ${scope.branch} (base ${scope.base})`,
    describe('code', plan.code),
    describe('specs', plan.specs),
  ];
  if (plan.wide) {
    lines.push(`reason: wide diff (${plan.code.length + plan.specs.length} code files); tests and typecheck not run`);
  }
  lines.push(commands.length === 0 ? 'ran: nothing (docs or tooling only)' : `ran: ${labels(commands)}`);
  lines.push('skipped: full suite, e2e, coverage, build');
  lines.push(`you run: ${youRun(scope.files)}`);

  if (dryRun) {
    lines[0] = 'agent-check: dry-run';
    for (const [, command] of commands) lines.push(`$ ${command}`);
    finish(0, lines);
  }

  for (const [label, command] of commands) {
    const result = runQuiet(command, root);
    if (result.ok) continue;
    lines[0] = 'agent-check: fail';
    finish(1, [...lines, '', `## ${label}`, failureExcerpt(result.text)]);
  }

  lines[0] = plan.wide ? 'agent-check: skipped' : 'agent-check: ok';
  finish(0, lines);
}

function youRun(files) {
  void files;
  return 'npm run verify';
}

function labels(commands) {
  return commands.map(([label]) => label).join(', ');
}

function describe(label, files) {
  if (files.length === 0) return '';
  const sample = files.slice(0, 6).join(', ');
  const more = files.length > 6 ? `, +${files.length - 6}` : '';
  return `${label}: ${sample}${more}`;
}

function finish(code, output) {
  const text = `${output.filter(Boolean).join('\n')}\n`;
  if (code === 0) process.stdout.write(text);
  else process.stderr.write(text);
  process.exit(code);
}

function isDirect() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === fileURLToPath(import.meta.url);
}
