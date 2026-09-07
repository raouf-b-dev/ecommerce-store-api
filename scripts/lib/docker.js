'use strict';

const { spawnSync } = require('child_process');

const COMPOSE_ENV_FILE = '.env.development';
const COMPOSE_WAIT_TIMEOUT_SEC = '120';
const DEV_INFRA_SERVICES = ['postgres', 'redis'];
const CORE_HOST_PORTS = ['5432', '6379', '8001'];
const PREFLIGHT_TIMEOUT_MS = 15_000;
const STDERR_TAIL_LINES = 4;

const COMPOSE_UP_DEV_ARGS = [
  'compose',
  '--env-file',
  COMPOSE_ENV_FILE,
  'up',
  '-d',
  '--wait',
  '--wait-timeout',
  COMPOSE_WAIT_TIMEOUT_SEC,
  ...DEV_INFRA_SERVICES,
];

const FAILURES = {
  missing: {
    message: 'Docker is not installed, or it is not on PATH.',
    hints: [
      'Install Docker Desktop: https://docs.docker.com/get-docker/',
      'Wait until it is fully running (tray icon idle).',
      'Open a new terminal after installing, then retry `npm run setup`.',
    ],
  },
  timeout: {
    message: 'Timed out waiting for Docker to respond.',
    hints: [
      'Docker Desktop may be stuck. Restart it, wait until the tray icon is idle, then retry.',
      'On Windows, a reboot is sometimes required after a fresh install.',
    ],
  },
  engineDown: {
    message: 'Docker is installed, but the engine is not running yet.',
    hints: [
      'Open Docker Desktop and wait until it has finished starting.',
      'After a fresh install, open a new terminal (Windows may require a reboot).',
    ],
  },
  composeTimeout: {
    message: 'Timed out waiting for Docker Compose to respond.',
    hints: [
      'Restart Docker Desktop, wait until it is idle, then retry.',
    ],
  },
  noCompose: {
    message: 'The Docker Compose plugin is not available.',
    hints: [
      'Docker Desktop includes Compose. Update Docker Desktop and retry.',
    ],
  },
  composeUp: {
    message: 'Could not start PostgreSQL and Redis.',
    hints: [
      'Docker printed the cause above.',
      `If a port is busy, free ${CORE_HOST_PORTS.join(', ')} (or remap DB_PORT / REDIS_PORT / REDIS_INSIGHT_PORT).`,
      `Logs: docker compose --env-file ${COMPOSE_ENV_FILE} logs ${DEV_INFRA_SERVICES.join(' ')}`,
      'If a container is unhealthy from a previous run: npm run setup:reset (wipes local volumes)',
    ],
  },
};

function spawnErrorCode(result) {
  return (result && result.error && result.error.code) || null;
}

function stderrTail(stderr, maxLines = STDERR_TAIL_LINES) {
  const text = `${stderr || ''}`.trim();
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-maxLines);
}

function dockerSaidHints(result) {
  const lines = stderrTail(result && result.stderr);
  if (!lines.length) return [];
  return ['Docker said:', ...lines];
}

function asFailure(code, extraHints = []) {
  const { message, hints } = FAILURES[code];
  return {
    ok: false,
    code,
    message,
    hints: hints.concat(extraHints),
  };
}

function classifyInfo(result) {
  const code = spawnErrorCode(result);
  if (code === 'ENOENT') return 'missing';
  if (code === 'ETIMEDOUT') return 'timeout';
  if (!result || result.status !== 0) return 'engineDown';
  return 'ok';
}

function classifyComposeVersion(result) {
  const code = spawnErrorCode(result);
  if (code === 'ENOENT') return 'missing';
  if (code === 'ETIMEDOUT') return 'composeTimeout';
  if (!result || result.status !== 0) return 'noCompose';
  return 'ok';
}

function checkDockerReady(runDocker) {
  const info = runDocker(['info']);
  const infoKind = classifyInfo(info);
  if (infoKind !== 'ok') {
    return asFailure(
      infoKind,
      infoKind === 'engineDown' ? dockerSaidHints(info) : [],
    );
  }

  const compose = runDocker(['compose', 'version']);
  const composeKind = classifyComposeVersion(compose);
  if (composeKind !== 'ok') {
    return asFailure(
      composeKind,
      composeKind === 'noCompose' ? dockerSaidHints(compose) : [],
    );
  }

  return { ok: true };
}

function createDockerRunner(cwd, spawn = spawnSync) {
  return function runDocker(args, extra = {}) {
    const timeout = Object.prototype.hasOwnProperty.call(extra, 'timeout')
      ? extra.timeout
      : PREFLIGHT_TIMEOUT_MS;
    const { timeout: _timeout, stdio, ...rest } = extra;
    const opts = { cwd, shell: false, ...rest };
    if (stdio !== undefined) {
      opts.stdio = stdio;
    } else {
      opts.encoding = 'utf8';
    }
    if (timeout != null) {
      opts.timeout = timeout;
    }
    return spawn('docker', args, opts);
  };
}

module.exports = {
  COMPOSE_ENV_FILE,
  COMPOSE_WAIT_TIMEOUT_SEC,
  COMPOSE_UP_DEV_ARGS,
  CORE_HOST_PORTS,
  DEV_INFRA_SERVICES,
  FAILURES,
  PREFLIGHT_TIMEOUT_MS,
  asFailure,
  checkDockerReady,
  classifyComposeVersion,
  classifyInfo,
  createDockerRunner,
  stderrTail,
};
