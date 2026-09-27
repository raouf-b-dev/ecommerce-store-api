#!/usr/bin/env node
'use strict';

// PostgreSQL backup automation for E-Commerce Store API.
//
// Usage:
//   node scripts/db-backup.js
//   node scripts/db-backup.js --output=backups/pre-release.dump --retain=14

const path = require('path');
const { loadEnv, parseArgs } = require('./lib/cli');
const {
  getDbConfig,
  runPgDump,
  ensureBackupsDir,
  defaultDumpFilename,
  applyRetention,
  writeAndValidateDump,
} = require('./lib/pg');

loadEnv();
const args = parseArgs();
const config = getDbConfig();

const backupsDir = ensureBackupsDir();
const outputPath = args.output
  ? path.resolve(args.output)
  : path.join(backupsDir, defaultDumpFilename());
const retainCount = parseInt(args.retain || '7', 10);

console.log(
  `▶ [db-backup] Starting PostgreSQL backup for database '${config.database}'...`,
);

try {
  const { buffer, via } = runPgDump(config);
  console.log(`ℹ️ [db-backup] Dump via ${via}`);

  const stats = writeAndValidateDump(buffer, outputPath, config);
  console.log(`✅ [db-backup] Backup completed successfully!`);
  console.log(`   File: ${outputPath}`);
  console.log(`   Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

  if (retainCount > 0 && !args.output) {
    applyRetention(backupsDir, retainCount);
  }
} catch (err) {
  console.error(`❌ [db-backup] Backup failed:`, err.message);
  process.exit(1);
}
