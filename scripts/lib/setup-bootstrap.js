'use strict';

const { asFailure } = require('./docker');

function failedCommand(message, status) {
  return {
    ok: false,
    code: 'commandFailed',
    message,
    hints: [],
    status: status || 1,
  };
}

function runSetup({
  log = console,
  envDevExists,
  generateEnvs,
  loadEnv,
  checkDocker,
  startInfra,
  runMigrations,
  runSeed,
  env = process.env,
}) {
  log.log('▶ [setup] Bootstrapping local development environment...\n');

  log.log('▶ Checking Docker...');
  const docker = checkDocker();
  if (!docker.ok) {
    return docker;
  }
  log.log('✓ Docker engine is running');

  if (!envDevExists()) {
    log.log('\n▶ Stage 1/4: Initializing local development environment files...');
    const envResult = generateEnvs();
    if (!envResult || envResult.status !== 0) {
      return failedCommand(
        'Failed to generate environment files.',
        envResult && envResult.status,
      );
    }
  } else {
    log.log('\n✓ Stage 1/4: Environment files already configured (.env.development)');
  }

  loadEnv();

  log.log('\n▶ Stage 2/4: Starting PostgreSQL & Redis Stack with healthcheck wait...');
  const composeResult = startInfra();
  if (!composeResult || composeResult.status !== 0) {
    return asFailure('composeUp');
  }

  log.log('\n▶ Stage 3/4: Running database migrations...');
  const migrationResult = runMigrations();
  if (!migrationResult || migrationResult.status !== 0) {
    return failedCommand(
      'Database migrations failed.',
      migrationResult && migrationResult.status,
    );
  }

  log.log('\n▶ Stage 4/4: Seeding demo fixtures (Users, Products, Inventory, Orders)...');
  const seedResult = runSeed();
  if (!seedResult || seedResult.status !== 0) {
    return failedCommand(
      'Database seeding failed.',
      seedResult && seedResult.status,
    );
  }

  return {
    ok: true,
    dbName: env.DB_DATABASE || 'my_database',
    dbPort: env.DB_PORT || '5432',
    redisPort: env.REDIS_PORT || '6379',
  };
}

module.exports = { runSetup };
