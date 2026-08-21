#!/usr/bin/env node
'use strict';

// Disposable-database restore drill (definition of done for Phase 14).
//
// Flow: backup source DB → drop/create disposable DB → restore dump → verify TOC.
// Does NOT touch the primary application database.
//
// Usage:
//   node scripts/db-restore-drill.js --yes
//   node scripts/db-restore-drill.js --yes --database=ecommerce_restore_drill

const path = require('path');
const fs = require('fs');
const { loadEnv, parseArgs } = require('./lib/cli');
const {
  getDbConfig,
  runPgDump,
  runPgRestore,
  listDump,
  recreateDatabase,
  ensureBackupsDir,
  writeAndValidateDump,
  runPsql,
} = require('./lib/pg');

loadEnv();
const args = parseArgs();

if (!args.yes && !args.y) {
  console.error(
    '❌ [db-restore-drill] Refusing to run without --yes (destructive to disposable DB only).',
  );
  console.error('   Usage: npm run db:restore:drill');
  console.error('          node scripts/db-restore-drill.js --yes');
  process.exit(1);
}

const sourceConfig = getDbConfig();
const drillDbName =
  (typeof args.database === 'string' && args.database) ||
  process.env.DB_RESTORE_DRILL_DATABASE ||
  'ecommerce_restore_drill';

if (drillDbName === sourceConfig.database) {
  console.error(
    `❌ [db-restore-drill] Drill database must differ from primary '${sourceConfig.database}'.`,
  );
  process.exit(1);
}

const drillConfig = getDbConfig({ database: drillDbName });
const backupsDir = ensureBackupsDir();
const drillDumpPath = path.join(backupsDir, `restore-drill_${Date.now()}.dump`);

console.log(`\n▶ [db-restore-drill] Starting restore drill`);
console.log(`   Source DB: ${sourceConfig.database}`);
console.log(`   Drill DB:  ${drillDbName}`);
console.log(`   Dump:      ${drillDumpPath}\n`);

try {
  console.log('1/5 Backup source database...');
  const { buffer, via } = runPgDump(sourceConfig);
  console.log(`   Dump via ${via}`);
  const stats = writeAndValidateDump(buffer, drillDumpPath, sourceConfig);
  console.log(
    `   Wrote ${(stats.size / (1024 * 1024)).toFixed(2)} MB → ${drillDumpPath}`,
  );

  console.log('2/5 Recreate disposable drill database...');
  recreateDatabase(drillDbName, sourceConfig);

  console.log('3/5 Restore dump into drill database...');
  listDump(drillDumpPath, drillConfig);
  const restore = runPgRestore(drillDumpPath, drillConfig);
  console.log(`   Restore via ${restore.via}`);

  console.log('4/5 Verify restored schema (migrations / public tables)...');
  const tableCheck = runPsql(
    `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public';`,
    drillConfig,
    { database: drillDbName },
  );
  console.log(`   information_schema.tables (public):\n${tableCheck.trim()}`);

  console.log(
    '5/5 Cleanup drill dump artifact (optional keep via --keep-dump)...',
  );
  if (!args['keep-dump']) {
    fs.unlinkSync(drillDumpPath);
    console.log(`   Removed ${path.basename(drillDumpPath)}`);
  } else {
    console.log(`   Kept ${drillDumpPath}`);
  }

  console.log(`\n✅ [db-restore-drill] Restore drill passed.`);
  console.log(
    `   Optional follow-up: point the app at '${drillDbName}', start it, run npm run smoke-test.\n`,
  );
} catch (err) {
  console.error(`\n❌ [db-restore-drill] Drill failed:`, err.message);
  if (fs.existsSync(drillDumpPath) && !args['keep-dump']) {
    try {
      fs.unlinkSync(drillDumpPath);
    } catch {
      /* ignore */
    }
  }
  process.exit(1);
}
