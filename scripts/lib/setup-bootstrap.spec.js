'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { printFailure } = require('./cli');
const { asFailure } = require('./docker');
const { runSetup } = require('./setup-bootstrap');

const silentLog = {
  lines: [],
  log(message) {
    this.lines.push(String(message));
  },
  error(message) {
    this.lines.push(String(message));
  },
};

function ok() {
  return { status: 0 };
}

function fail(status = 1) {
  return { status };
}

function setupDeps(overrides) {
  silentLog.lines = [];
  const calls = [];
  const deps = {
    log: silentLog,
    envDevExists: () => true,
    generateEnvs: () => {
      calls.push('generateEnvs');
      return ok();
    },
    loadEnv: () => {
      calls.push('loadEnv');
    },
    checkDocker: () => {
      calls.push('checkDocker');
      return { ok: true };
    },
    startInfra: () => {
      calls.push('startInfra');
      return ok();
    },
    runMigrations: () => {
      calls.push('runMigrations');
      return ok();
    },
    runSeed: () => {
      calls.push('runSeed');
      return ok();
    },
    env: {
      DB_DATABASE: 'demo_db',
      DB_PORT: '5433',
      REDIS_PORT: '6380',
    },
    ...overrides,
  };
  return { deps, calls };
}

describe('runSetup', () => {
  it('stops before env generation when Docker is not ready', () => {
    const { deps, calls } = setupDeps({
      checkDocker: () => {
        calls.push('checkDocker');
        return asFailure('missing');
      },
    });
    const result = runSetup(deps);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'missing');
    assert.deepEqual(calls, ['checkDocker']);
  });

  it('generates env files when .env.development is missing', () => {
    const { deps, calls } = setupDeps({
      envDevExists: () => false,
    });
    const result = runSetup(deps);
    assert.equal(result.ok, true);
    assert.deepEqual(calls, [
      'checkDocker',
      'generateEnvs',
      'loadEnv',
      'startInfra',
      'runMigrations',
      'runSeed',
    ]);
  });

  it('stops when env generation fails', () => {
    const { deps, calls } = setupDeps({
      envDevExists: () => false,
      generateEnvs: () => {
        calls.push('generateEnvs');
        return fail(1);
      },
    });
    const result = runSetup(deps);
    assert.equal(result.ok, false);
    assert.equal(result.message, 'Failed to generate environment files.');
    assert.equal(calls.includes('startInfra'), false);
  });

  it('skips env generation when .env.development already exists', () => {
    const { deps, calls } = setupDeps();
    const result = runSetup(deps);
    assert.equal(result.ok, true);
    assert.equal(calls.includes('generateEnvs'), false);
    assert.deepEqual(calls, [
      'checkDocker',
      'loadEnv',
      'startInfra',
      'runMigrations',
      'runSeed',
    ]);
  });

  it('does not run migrations when compose up fails', () => {
    const { deps, calls } = setupDeps({
      startInfra: () => {
        calls.push('startInfra');
        return fail(1);
      },
    });
    const result = runSetup(deps);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'composeUp');
    assert.equal(calls.includes('runMigrations'), false);
    assert.equal(
      result.hints.some((hint) => /new terminal/i.test(hint)),
      false,
    );
    assert.match(result.hints.join('\n'), /5432, 6379, 8001/);
    assert.match(result.hints.join('\n'), /REDIS_INSIGHT_PORT/);
    assert.match(result.hints.join('\n'), /logs postgres redis/);
    assert.match(result.hints.join('\n'), /setup:reset \(wipes local volumes\)/);
  });

  it('does not seed when migrations fail', () => {
    const { deps, calls } = setupDeps({
      runMigrations: () => {
        calls.push('runMigrations');
        return fail(2);
      },
    });
    const result = runSetup(deps);
    assert.equal(result.ok, false);
    assert.equal(result.message, 'Database migrations failed.');
    assert.equal(result.status, 2);
    assert.equal(calls.includes('runSeed'), false);
  });

  it('reports seed failure after migrations succeed', () => {
    const { deps, calls } = setupDeps({
      runSeed: () => {
        calls.push('runSeed');
        return fail(1);
      },
    });
    const result = runSetup(deps);
    assert.equal(result.ok, false);
    assert.equal(result.message, 'Database seeding failed.');
    assert.deepEqual(calls, [
      'checkDocker',
      'loadEnv',
      'startInfra',
      'runMigrations',
      'runSeed',
    ]);
  });

  it('returns connection summary after a full success', () => {
    const { deps } = setupDeps();
    const result = runSetup(deps);
    assert.deepEqual(result, {
      ok: true,
      dbName: 'demo_db',
      dbPort: '5433',
      redisPort: '6380',
    });
  });
});

describe('printFailure', () => {
  it('prints the message and indented hints', () => {
    const errors = [];
    printFailure(
      { message: 'boom', hints: ['first', 'second'] },
      {
        log: { error: (line) => errors.push(line) },
        label: 'setup',
      },
    );
    assert.deepEqual(errors, ['❌ [setup] boom', '   first', '   second']);
  });
});
