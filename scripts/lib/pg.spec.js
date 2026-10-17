'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { getDbConfig } = require('./pg');

const DB_KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
  'POSTGRES_CONTAINER_NAME',
];

describe('getDbConfig', () => {
  let saved;

  beforeEach(() => {
    saved = Object.fromEntries(DB_KEYS.map((key) => [key, process.env[key]]));
    for (const key of DB_KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of DB_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('throws naming DB_HOST when it is unset', () => {
    process.env.DB_USERNAME = 'user';
    process.env.DB_PASSWORD = 'pass';
    process.env.DB_DATABASE = 'db';

    assert.throws(() => getDbConfig(), /DB_HOST is required/);
  });

  it('throws naming DB_DATABASE when it is unset', () => {
    process.env.DB_HOST = 'db.internal';
    process.env.DB_USERNAME = 'user';
    process.env.DB_PASSWORD = 'pass';

    assert.throws(() => getDbConfig(), /DB_DATABASE is required/);
  });

  it('reads DB_* and keeps the validate-env DB_PORT default', () => {
    process.env.DB_HOST = 'db.internal';
    process.env.DB_USERNAME = 'user';
    process.env.DB_PASSWORD = 'pass';
    process.env.DB_DATABASE = 'shop';

    assert.deepEqual(getDbConfig(), {
      host: 'db.internal',
      port: '5432',
      username: 'user',
      password: 'pass',
      database: 'shop',
      containerName: 'postgres-db',
    });
  });

  it('lets overrides replace env values', () => {
    process.env.DB_HOST = 'db.internal';
    process.env.DB_USERNAME = 'user';
    process.env.DB_PASSWORD = 'pass';
    process.env.DB_DATABASE = 'shop';

    assert.equal(
      getDbConfig({ database: 'ecommerce_restore_drill' }).database,
      'ecommerce_restore_drill',
    );
  });
});
