#!/usr/bin/env node
'use strict';

// One-time BullMQ v5 -> v6 migration step: remove legacy repeatable-job
// entries (Queue.add with `repeat`) after the app runs on Job Schedulers.
// Run on bullmq 5 only, after deploying the upsertJobScheduler release.
// See docs/infrastructure/REDIS.md#bullmq-v6-migration.
//
// Usage:
//   node scripts/bullmq-clean-legacy-repeatables.js         (dry run, lists entries)
//   node scripts/bullmq-clean-legacy-repeatables.js --yes   (removes them)

const { Queue } = require('bullmq');
const { loadEnv, parseArgs } = require('./lib/cli');
const {
  LEGACY_REPEATABLE_QUEUES,
  getBullMqConnection,
  cleanLegacyRepeatables,
} = require('./lib/bullmq-legacy-repeatables');

async function main() {
  loadEnv();
  const args = parseArgs();
  const apply = Boolean(args.yes || args.y);
  const connection = getBullMqConnection();
  const prefix = process.env.REDIS_KEYPREFIX;
  if (!prefix) {
    throw new Error('REDIS_KEYPREFIX must be set (BullMQ queue prefix)');
  }

  console.log(
    `[bullmq-clean] ${apply ? 'Removing' : 'Dry run: listing'} legacy repeatable jobs (prefix '${prefix}')`,
  );

  let pending = 0;
  for (const name of LEGACY_REPEATABLE_QUEUES) {
    const queue = new Queue(name, { connection, prefix });
    try {
      const result = await cleanLegacyRepeatables(queue, { apply });
      console.log(
        `[bullmq-clean] ${name}: legacy=${result.legacy.length} removed=${result.removed.length} schedulers kept=${result.kept.length}`,
      );
      for (const key of result.legacy) {
        console.log(`   legacy: ${key}`);
      }
      pending += result.legacy.length - result.removed.length;
    } finally {
      await queue.close();
    }
  }

  if (!apply && pending > 0) {
    console.log('[bullmq-clean] Re-run with --yes to remove them.');
  } else if (apply && pending > 0) {
    throw new Error(`${pending} legacy entries could not be removed`);
  }
}

main().catch((err) => {
  console.error('[bullmq-clean] Failed:', err.message);
  process.exit(1);
});
