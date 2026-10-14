#!/usr/bin/env node
/**
 * Run one command. A pass prints one line. A failure prints from the first
 * error, capped. Passing logs never enter the chat.
 *
 * node scripts/agent-run.mjs -- npx vitest run src/foo.spec.ts --reporter=minimal
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { failureExcerpt, runQuiet } from './agent-output.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const start = args[0] === '--' ? 1 : 0;
const command = args.slice(start).join(' ').trim();

if (!command) {
  process.stderr.write('usage: node scripts/agent-run.mjs -- <command>\n');
  process.exit(2);
}

const result = runQuiet(command, root);
if (result.ok) {
  process.stdout.write(`ok: ${command}\n`);
  process.exit(0);
}

process.stderr.write(`fail: ${command}\n${failureExcerpt(result.text)}\n`);
process.exit(1);
