#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { lintRepo, formatFinding } = require('./ascii-prose.cjs');

const fix = process.argv.includes('--fix');
const rootDir = process.cwd();
const { findings, changed, scanned } = lintRepo(rootDir, { fix });

if (fix) {
  process.stdout.write(
    `ascii-prose: scanned ${scanned} files, rewrote ${changed}\n`,
  );
  process.exit(0);
}

if (findings.length > 0) {
  for (const finding of findings) {
    process.stderr.write(`${formatFinding(finding, rootDir)}\n`);
  }
  process.stderr.write(
    `ascii-prose: ${findings.length} smart-punctuation hit(s) in docs or comments. Use ASCII (hyphen, straight quotes, ...). See docs/ai/CONVENTIONS.md.\n`,
  );
  process.exit(1);
}

process.stdout.write(`ascii-prose: ${scanned} files clean\n`);
