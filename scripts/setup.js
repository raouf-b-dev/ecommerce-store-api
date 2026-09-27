#!/usr/bin/env node
'use strict';

const { existsSync } = require('fs');
const { resolve } = require('path');
const { spawnSync } = require('child_process');
const { loadEnv, printFailure } = require('./lib/cli');
const {
  COMPOSE_UP_DEV_ARGS,
  checkDockerReady,
  createDockerRunner,
} = require('./lib/docker');
const { runSetup } = require('./lib/setup-bootstrap');

const repoRoot = resolve(__dirname, '..');
const envDevPath = resolve(repoRoot, '.env.development');
const runDocker = createDockerRunner(repoRoot);

const result = runSetup({
  log: console,
  envDevExists: () => existsSync(envDevPath),
  generateEnvs: () =>
    spawnSync('node', ['scripts/generate-envs.js'], {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: false,
    }),
  loadEnv,
  checkDocker: () => checkDockerReady(runDocker),
  startInfra: () =>
    runDocker(COMPOSE_UP_DEV_ARGS, { stdio: 'inherit', timeout: null }),
  runMigrations: () =>
    spawnSync('npm run migration:run:dev', {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: true,
    }),
  runSeed: () =>
    spawnSync('npm run db:seed', {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: true,
    }),
  env: process.env,
});

if (!result.ok) {
  printFailure(result);
  process.exit(result.status || 1);
}

console.log(
  `\n✅ [setup] Environment ready (PostgreSQL :${result.dbPort}/${result.dbName}, Redis :${result.redisPort}, fully seeded)`,
);
console.log('   Next: npm run start:dev');
console.log('   Creds: docs/development/SEEDING.md\n');
