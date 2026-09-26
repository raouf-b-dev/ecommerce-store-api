#!/usr/bin/env node
// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

'use strict';

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
