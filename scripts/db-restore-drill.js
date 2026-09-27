#!/usr/bin/env node
'use strict';

// Disposable-database restore drill.
// Flow: insert marker → backup → recreate disposable DB → restore →
//       assert known tables + marker → cleanup source marker.
//
// Usage:
//   node scripts/db-restore-drill.js --yes
//   node scripts/db-restore-drill.js --yes --database=ecommerce_restore_drill --keep-dump

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
  queryScalarInt,
  assertRequiredTables,
} = require('./lib/pg');

const REQUIRED_TABLES = [
  'users',
  'products',
  'orders',
  'payments',
  'reservations',
];

loadEnv();
const args = parseArgs();

if (!args.yes && !args.y) {
  console.error(
    '[db-restore-drill] Refusing to run without --yes (destructive to disposable DB only).',
  );
  console.error('  Usage: npm run db:restore:drill');
  console.error('         node scripts/db-restore-drill.js --yes');
  process.exit(1);
}

const sourceConfig = getDbConfig();
const drillDbName =
  (typeof args.database === 'string' && args.database) ||
  process.env.DB_RESTORE_DRILL_DATABASE ||
  'ecommerce_restore_drill';

if (drillDbName === sourceConfig.database) {
  console.error(
    `[db-restore-drill] Drill database must differ from primary '${sourceConfig.database}'.`,
  );
  process.exit(1);
}

const drillConfig = getDbConfig({ database: drillDbName });
const backupsDir = ensureBackupsDir();
const drillDumpPath = path.join(backupsDir, `restore-drill_${Date.now()}.dump`);
const markerSlug = `restore-drill-marker-${Date.now()}`.replace(
  /[^a-zA-Z0-9_-]/g,
  '',
);
const markerSku = `RDM-${Date.now()}`;

function cleanupSourceMarker() {
  try {
    runPsql(`DELETE FROM products WHERE slug = '${markerSlug}';`, sourceConfig);
    console.log(`[db-restore-drill] Cleaned source marker slug=${markerSlug}`);
  } catch (err) {
    console.warn(
      `[db-restore-drill] Failed to clean source marker: ${err.message}`,
    );
  }
}

console.log('[db-restore-drill] Starting');
console.log(`  source=${sourceConfig.database} drill=${drillDbName}`);
console.log(`  dump=${drillDumpPath} marker=${markerSlug}`);

try {
  console.log('[db-restore-drill] 1/6 Insert marker');
  runPsql(
    `INSERT INTO products (name, slug, sku, price, currency, is_active, version)
     VALUES (
       'Restore Drill Marker',
       '${markerSlug}',
       '${markerSku}',
       0.01,
       'USD',
       true,
       1
     );`,
    sourceConfig,
  );

  console.log('[db-restore-drill] 2/6 Backup source');
  const { buffer, via } = runPgDump(sourceConfig);
  const stats = writeAndValidateDump(buffer, drillDumpPath, sourceConfig);
  console.log(
    `  via=${via} size_mb=${(stats.size / (1024 * 1024)).toFixed(2)}`,
  );

  console.log('[db-restore-drill] 3/6 Recreate drill database');
  recreateDatabase(drillDbName, sourceConfig);

  console.log('[db-restore-drill] 4/6 Restore dump');
  listDump(drillDumpPath, drillConfig);
  const restore = runPgRestore(drillDumpPath, drillConfig);
  console.log(`  via=${restore.via}`);

  console.log('[db-restore-drill] 5/6 Assert schema + marker');
  const tableCount = queryScalarInt(
    `SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public'`,
    drillConfig,
    { database: drillDbName },
  );
  if (!Number.isFinite(tableCount) || tableCount <= 0) {
    throw new Error(
      `Empty schema after restore (public table count=${Number.isFinite(tableCount) ? tableCount : 'unknown'}). Run migrations before the drill.`,
    );
  }
  assertRequiredTables(REQUIRED_TABLES, drillConfig, {
    database: drillDbName,
  });
  const markerCount = queryScalarInt(
    `SELECT COUNT(*)::int FROM products WHERE slug = '${markerSlug}'`,
    drillConfig,
    { database: drillDbName },
  );
  if (markerCount !== 1) {
    throw new Error(
      `Marker not restored (expected 1 row slug=${markerSlug}, got ${Number.isFinite(markerCount) ? markerCount : 'unknown'})`,
    );
  }
  console.log(
    `  tables=${tableCount} required_ok marker_ok slug=${markerSlug}`,
  );

  console.log('[db-restore-drill] 6/6 Cleanup dump');
  if (!args['keep-dump']) {
    fs.unlinkSync(drillDumpPath);
    console.log(`  removed ${path.basename(drillDumpPath)}`);
  } else {
    console.log(`  kept ${drillDumpPath}`);
  }

  console.log('[db-restore-drill] Passed');
} catch (err) {
  console.error(`[db-restore-drill] Failed: ${err.message}`);
  if (fs.existsSync(drillDumpPath) && !args['keep-dump']) {
    try {
      fs.unlinkSync(drillDumpPath);
    } catch {
      /* ignore */
    }
  }
  process.exitCode = 1;
} finally {
  cleanupSourceMarker();
  if (process.exitCode === 1) {
    process.exit(1);
  }
}
