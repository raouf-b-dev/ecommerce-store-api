'use strict';

const { isEnvTruthy } = require('./env-bool');

/**
 * Queues that registered BullMQ v5 repeatable jobs via `Queue.add(..., { repeat })`
 * before the move to Job Schedulers. Names match `BullModule.registerQueue`
 * in the inventory, notifications, and orders modules.
 */
const LEGACY_REPEATABLE_QUEUES = Object.freeze([
  'inventory',
  'notifications',
  'checkout',
]);

/**
 * BullMQ connection fields from `REDIS_*` env, mirroring
 * `buildIoRedisConnection` in src/infrastructure/redis/redis-connection.options.ts.
 * @param {NodeJS.ProcessEnv} env
 */
function getBullMqConnection(env = process.env) {
  const port = Number.parseInt(env.REDIS_PORT ?? '', 10);
  const db = Number.parseInt(env.REDIS_DB ?? '', 10);
  if (!env.REDIS_HOST || Number.isNaN(port) || Number.isNaN(db)) {
    throw new Error('REDIS_HOST, REDIS_PORT and REDIS_DB must be set');
  }
  return {
    host: env.REDIS_HOST,
    port,
    password: env.REDIS_PASSWORD || undefined,
    db,
    ...(isEnvTruthy(env.REDIS_TLS) ? { tls: {} } : {}),
  };
}

/**
 * Finds the legacy v5 repeatable entries on one queue and, when `apply` is true,
 * removes them. Job Schedulers share the same Redis set; they are recognised by
 * the iteration count that only `upsertJobScheduler` writes, and are kept.
 * Idempotent: a second run finds nothing to remove.
 *
 * @param {Pick<import('bullmq').Queue, 'name' | 'getRepeatableJobs' | 'getJobScheduler' | 'removeRepeatableByKey'>} queue
 * @param {{ apply: boolean }} options
 * @returns {Promise<{ queue: string, legacy: string[], removed: string[], kept: string[] }>}
 */
async function cleanLegacyRepeatables(queue, { apply }) {
  const entries = await queue.getRepeatableJobs();
  const legacy = [];
  const kept = [];
  for (const { key } of entries) {
    const scheduler = await queue.getJobScheduler(key);
    if (scheduler && scheduler.iterationCount !== undefined) {
      kept.push(key);
    } else {
      legacy.push(key);
    }
  }

  const removed = [];
  if (apply) {
    for (const key of legacy) {
      if (await queue.removeRepeatableByKey(key)) {
        removed.push(key);
      }
    }
  }
  return { queue: queue.name, legacy, removed, kept };
}

module.exports = {
  LEGACY_REPEATABLE_QUEUES,
  getBullMqConnection,
  cleanLegacyRepeatables,
};
