'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  COMPOSE_ENV_FILE,
  COMPOSE_UP_DEV_ARGS,
  COMPOSE_WAIT_TIMEOUT_SEC,
  CORE_HOST_PORTS,
  DEV_INFRA_SERVICES,
  PREFLIGHT_TIMEOUT_MS,
  checkDockerReady,
  classifyComposeVersion,
  classifyInfo,
  createDockerRunner,
  stderrTail,
} = require('./docker');

const repoRoot = path.join(__dirname, '../..');

function ok() {
  return { status: 0, error: null, stderr: '' };
}

function enoent() {
  return { status: null, error: { code: 'ENOENT' }, stderr: '' };
}

function timedOut() {
  return { status: null, error: { code: 'ETIMEDOUT' }, stderr: '' };
}

function failed(stderr) {
  return { status: 1, error: null, stderr };
}

function mockRunDocker(handlers) {
  const calls = [];
  function runDocker(args) {
    calls.push(args.slice());
    if (args[0] === 'info') return handlers.info;
    if (args[0] === 'compose' && args[1] === 'version') {
      return handlers.composeVersion;
    }
    throw new Error(`unexpected docker ${args.join(' ')}`);
  }
  runDocker.calls = calls;
  return runDocker;
}

describe('classifyInfo', () => {
  it('maps ENOENT to missing', () => {
    assert.equal(classifyInfo(enoent()), 'missing');
  });

  it('maps ETIMEDOUT to timeout', () => {
    assert.equal(classifyInfo(timedOut()), 'timeout');
  });

  it('maps non-zero status to engineDown', () => {
    assert.equal(classifyInfo(failed('pipe error')), 'engineDown');
  });

  it('maps status 0 to ok', () => {
    assert.equal(classifyInfo(ok()), 'ok');
  });
});

describe('classifyComposeVersion', () => {
  it('maps ENOENT to missing', () => {
    assert.equal(classifyComposeVersion(enoent()), 'missing');
  });

  it('maps ETIMEDOUT to composeTimeout', () => {
    assert.equal(classifyComposeVersion(timedOut()), 'composeTimeout');
  });

  it('maps non-zero status to noCompose', () => {
    assert.equal(classifyComposeVersion(failed('plugin not found')), 'noCompose');
  });
});

describe('stderrTail', () => {
  it('returns an empty list for blank stderr', () => {
    assert.deepEqual(stderrTail(''), []);
    assert.deepEqual(stderrTail(null), []);
  });

  it('keeps the last four non-empty lines', () => {
    const stderr = ['a', '', 'b', 'c', 'd', 'e', 'f'].join('\n');
    assert.deepEqual(stderrTail(stderr), ['c', 'd', 'e', 'f']);
  });
});

describe('checkDockerReady', () => {
  it('succeeds when info and compose version succeed', () => {
    const runDocker = mockRunDocker({ info: ok(), composeVersion: ok() });
    const result = checkDockerReady(runDocker);
    assert.equal(result.ok, true);
    assert.deepEqual(runDocker.calls, [['info'], ['compose', 'version']]);
  });

  it('does not probe compose when docker is missing', () => {
    const runDocker = mockRunDocker({ info: enoent(), composeVersion: ok() });
    const result = checkDockerReady(runDocker);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'missing');
    assert.match(result.message, /not on PATH/);
    assert.equal(runDocker.calls.length, 1);
  });

  it('reports a hung engine as a timeout', () => {
    const result = checkDockerReady(
      mockRunDocker({ info: timedOut(), composeVersion: ok() }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, 'timeout');
    assert.match(result.message, /Timed out/);
  });

  it('reports engine-down with the last docker stderr lines', () => {
    const result = checkDockerReady(
      mockRunDocker({
        info: failed('line-one\nline-two\nline-three'),
        composeVersion: ok(),
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, 'engineDown');
    assert.match(result.message, /engine is not running/);
    assert.deepEqual(result.hints.slice(-4), [
      'Docker said:',
      'line-one',
      'line-two',
      'line-three',
    ]);
  });

  it('reports a missing compose plugin after a healthy engine', () => {
    const result = checkDockerReady(
      mockRunDocker({
        info: ok(),
        composeVersion: failed('compose plugin not found'),
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, 'noCompose');
    assert.match(result.message, /Compose plugin is not available/);
  });
});

describe('createDockerRunner', () => {
  it('applies the preflight timeout and captures stderr as text', () => {
    let captured;
    const runDocker = createDockerRunner('/repo', (_cmd, args, opts) => {
      captured = { args, opts };
      return ok();
    });
    runDocker(['info']);
    assert.deepEqual(captured.args, ['info']);
    assert.equal(captured.opts.cwd, '/repo');
    assert.equal(captured.opts.shell, false);
    assert.equal(captured.opts.timeout, PREFLIGHT_TIMEOUT_MS);
    assert.equal(captured.opts.encoding, 'utf8');
  });

  it('does not cap compose up with the preflight timeout', () => {
    let captured;
    const runDocker = createDockerRunner('/repo', (_cmd, _args, opts) => {
      captured = opts;
      return ok();
    });
    runDocker(COMPOSE_UP_DEV_ARGS, { stdio: 'inherit', timeout: null });
    assert.equal(captured.stdio, 'inherit');
    assert.equal(captured.timeout, undefined);
    assert.equal(captured.encoding, undefined);
  });
});

describe('compose up contract', () => {
  it('waits for postgres and redis with a 120s health timeout', () => {
    assert.deepEqual(COMPOSE_UP_DEV_ARGS, [
      'compose',
      '--env-file',
      COMPOSE_ENV_FILE,
      'up',
      '-d',
      '--wait',
      '--wait-timeout',
      COMPOSE_WAIT_TIMEOUT_SEC,
      ...DEV_INFRA_SERVICES,
    ]);
    assert.equal(COMPOSE_WAIT_TIMEOUT_SEC, '120');
  });

  it('uses docker-up-dev.js as the single npm entry for d:up:dev', () => {
    const pkg = require('../../package.json');
    assert.equal(pkg.scripts['d:up:dev'], 'node scripts/docker-up-dev.js');
    assert.match(pkg.scripts['test:scripts'], /scripts\/\*\*\/\*\.spec\.js/);
  });

  it('keeps compose image defaults aligned with .env.example', () => {
    const example = fs.readFileSync(path.join(repoRoot, '.env.example'), 'utf8');
    const compose = fs.readFileSync(
      path.join(repoRoot, 'docker-compose.yaml'),
      'utf8',
    );
    const redisImage = example.match(/^REDIS_IMAGE=(.*)$/m)[1];
    const postgresImage = example.match(/^POSTGRES_IMAGE=(.*)$/m)[1];
    const redisName = example.match(/^REDIS_CONTAINER_NAME=(.*)$/m)[1];
    const postgresName = example.match(/^POSTGRES_CONTAINER_NAME=(.*)$/m)[1];
    const insightPort = example.match(/^REDIS_INSIGHT_PORT=(.*)$/m)[1];
    const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    assert.match(compose, new RegExp(`REDIS_IMAGE:-${escape(redisImage)}`));
    assert.match(
      compose,
      new RegExp(`POSTGRES_IMAGE:-${escape(postgresImage)}`),
    );
    assert.match(
      compose,
      new RegExp(`REDIS_CONTAINER_NAME:-${escape(redisName)}`),
    );
    assert.match(
      compose,
      new RegExp(`POSTGRES_CONTAINER_NAME:-${escape(postgresName)}`),
    );
    assert.match(
      compose,
      new RegExp(`REDIS_INSIGHT_PORT:-${escape(insightPort)}`),
    );
    assert.match(compose, /start_period: 40s/);
    for (const port of CORE_HOST_PORTS) {
      assert.match(compose, new RegExp(port));
    }
  });
});
