'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  LEGACY_REPEATABLE_QUEUES,
  getBullMqConnection,
  cleanLegacyRepeatables,
} = require('./bullmq-legacy-repeatables');

const SCHEDULER_ID = 'inventory-reconciliation-job';
const LEGACY_KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

function fakeQueue(entries) {
  const store = new Map(entries.map((e) => [e.key, e]));
  const removeCalls = [];
  return {
    name: 'inventory',
    removeCalls,
    getRepeatableJobs: async () =>
      [...store.values()].map(({ key }) => ({ key })),
    getJobScheduler: async (key) => {
      const entry = store.get(key);
      if (!entry) return undefined;
      return entry.scheduler ? { key, iterationCount: 1 } : { key };
    },
    removeRepeatableByKey: async (key) => {
      removeCalls.push(key);
      return store.delete(key);
    },
  };
}

const ENTRIES = [
  { key: SCHEDULER_ID, scheduler: true },
  { key: LEGACY_KEY, scheduler: false },
];

describe('cleanLegacyRepeatables', () => {
  it('dry run lists legacy entries and removes nothing', async () => {
    const queue = fakeQueue(ENTRIES);
    const result = await cleanLegacyRepeatables(queue, { apply: false });
    assert.deepEqual(result, {
      queue: 'inventory',
      legacy: [LEGACY_KEY],
      removed: [],
      kept: [SCHEDULER_ID],
    });
    assert.deepEqual(queue.removeCalls, []);
  });

  it('apply removes only legacy entries and keeps Job Schedulers', async () => {
    const queue = fakeQueue(ENTRIES);
    const result = await cleanLegacyRepeatables(queue, { apply: true });
    assert.deepEqual(result.removed, [LEGACY_KEY]);
    assert.deepEqual(result.kept, [SCHEDULER_ID]);
    assert.deepEqual(queue.removeCalls, [LEGACY_KEY]);
  });

  it('is idempotent: a second apply finds nothing', async () => {
    const queue = fakeQueue(ENTRIES);
    await cleanLegacyRepeatables(queue, { apply: true });
    const second = await cleanLegacyRepeatables(queue, { apply: true });
    assert.deepEqual(second.legacy, []);
    assert.deepEqual(second.removed, []);
    assert.deepEqual(queue.removeCalls, [LEGACY_KEY]);
  });

  it('does not report an entry as removed when BullMQ returns false', async () => {
    const queue = fakeQueue(ENTRIES);
    queue.removeRepeatableByKey = async () => false;
    const result = await cleanLegacyRepeatables(queue, { apply: true });
    assert.deepEqual(result.legacy, [LEGACY_KEY]);
    assert.deepEqual(result.removed, []);
  });
});

describe('getBullMqConnection', () => {
  it('maps REDIS_* env like buildIoRedisConnection', () => {
    assert.deepEqual(
      getBullMqConnection({
        REDIS_HOST: 'redis',
        REDIS_PORT: '6380',
        REDIS_DB: '2',
        REDIS_PASSWORD: 'secret',
        REDIS_TLS: 'true',
      }),
      { host: 'redis', port: 6380, password: 'secret', db: 2, tls: {} },
    );
  });

  it('omits empty password and tls when disabled', () => {
    assert.deepEqual(
      getBullMqConnection({
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        REDIS_DB: '0',
        REDIS_PASSWORD: '',
        REDIS_TLS: 'false',
      }),
      { host: 'localhost', port: 6379, password: undefined, db: 0 },
    );
  });

  it('throws when required vars are missing', () => {
    assert.throws(() => getBullMqConnection({ REDIS_HOST: 'x' }), /REDIS_PORT/);
  });
});

describe('LEGACY_REPEATABLE_QUEUES', () => {
  it('matches the queues registered in the app modules', () => {
    assert.deepEqual(
      [...LEGACY_REPEATABLE_QUEUES],
      ['inventory', 'notifications', 'checkout'],
    );
  });
});
