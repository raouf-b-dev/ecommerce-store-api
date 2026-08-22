#!/usr/bin/env node
'use strict';

// PostgreSQL restore automation for E-Commerce Store API.
//
// Usage:
//   node scripts/db-restore.js --from=backups/ecommerce-store-api_....dump --yes
//   node scripts/db-restore.js   (restores most recent dump in backups/)

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { loadEnv, parseArgs } = require('./lib/cli');
const {
  getDbConfig,
  runPgRestore,
  findLatestDump,
  listDump,
} = require('./lib/pg');

loadEnv();
const args = parseArgs();
const config = getDbConfig();

const backupsDir = path.join(process.cwd(), 'backups');
let targetDump = args.from ? path.resolve(args.from) : null;

if (!targetDump) {
  const latest = findLatestDump(backupsDir);
  if (!latest) {
    console.error(
      `❌ [db-restore] No .dump backup files found in ${backupsDir}`,
    );
    process.exit(1);
  }
  targetDump = latest.path;
}

if (!fs.existsSync(targetDump)) {
  console.error(
    `❌ [db-restore] Target dump file does not exist: ${targetDump}`,
  );
  process.exit(1);
}

function executeRestore() {
  console.log(
    `▶ [db-restore] Restoring database '${config.database}' from '${path.basename(targetDump)}'...`,
  );

  try {
    listDump(targetDump, config);
    const { via } = runPgRestore(targetDump, config);
    console.log(`ℹ️ [db-restore] Restore via ${via}`);
    console.log(`✅ [db-restore] Database restore completed successfully!`);
  } catch (err) {
    console.error(`❌ [db-restore] Restore failed:`, err.message);
    process.exit(1);
  }
}

if (args.yes || args.y) {
  executeRestore();
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(
    `\n⚠️  WARNING: Restoring will OVERWRITE existing data in database '${config.database}'.`,
  );
  console.log(`   Dump file: ${targetDump}\n`);

  rl.question('Are you sure you want to proceed? (y/N): ', (answer) => {
    rl.close();
    if (
      answer.trim().toLowerCase() === 'y' ||
      answer.trim().toLowerCase() === 'yes'
    ) {
      executeRestore();
    } else {
      console.log('🛑 [db-restore] Restore cancelled by user.');
      process.exit(0);
    }
  });
}
