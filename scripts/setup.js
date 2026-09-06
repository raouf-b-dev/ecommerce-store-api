#!/usr/bin/env node
// scripts/setup.js
// ─────────────────────────────────────────────────────────────────────────────
// Headless API Environment Setup Bootstrap.
// Prepares local development: .env -> Docker infra (Postgres+Redis with --wait)
// -> TypeORM migrations -> Demo database seeding.
// ─────────────────────────────────────────────────────────────────────────────

const { existsSync } = require('fs');
const { resolve } = require('path');
const { spawnSync } = require('child_process');
const { loadEnv } = require('./lib/cli');

const repoRoot = resolve(__dirname, '..');
const envDevPath = resolve(repoRoot, '.env.development');

console.log('▶ [setup] Bootstrapping local development environment...\n');

// Stage 1: Generate development environment files if missing
if (!existsSync(envDevPath)) {
  console.log('▶ Stage 1/4: Initializing local development environment files...');
  const envResult = spawnSync(
    'node',
    ['scripts/generate-envs.js'],
    { cwd: repoRoot, stdio: 'inherit', shell: false }
  );
  if (envResult.status !== 0) {
    console.error('❌ [setup] Failed to generate environment files.');
    process.exit(envResult.status || 1);
  }
} else {
  console.log('✓ Stage 1/4: Environment files already configured (.env.development)');
}

// Load environment variables into process.env using shared repo helper
loadEnv();

// Stage 2: Boot PostgreSQL & Redis Stack in Docker with native healthcheck waiting
console.log('\n▶ Stage 2/4: Starting PostgreSQL & Redis Stack with healthcheck wait...');
const composeResult = spawnSync(
  'docker',
  ['compose', '--env-file', '.env.development', 'up', '-d', '--wait', 'postgres', 'redis'],
  { cwd: repoRoot, stdio: 'inherit', shell: false }
);
if (composeResult.status !== 0) {
  console.error('❌ [setup] Docker Compose failed to start or healthchecks timed out.');
  process.exit(composeResult.status || 1);
}

// Stage 3: Run TypeORM database migrations
console.log('\n▶ Stage 3/4: Running database migrations...');
const migrationResult = spawnSync('npm run migration:run:dev', {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: true,
});
if (migrationResult.status !== 0) {
  console.error('❌ [setup] Database migrations failed.');
  process.exit(migrationResult.status || 1);
}

// Stage 4: Run demo database seeding
console.log('\n▶ Stage 4/4: Seeding demo fixtures (Users, Products, Inventory, Orders)...');
const seedResult = spawnSync('npm run db:seed', {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: true,
});
if (seedResult.status !== 0) {
  console.error('❌ [setup] Database seeding failed.');
  process.exit(seedResult.status || 1);
}

const dbName = process.env.DB_DATABASE || 'my_database';
const dbPort = process.env.DB_PORT || '5432';
const redisPort = process.env.REDIS_PORT || '6379';

console.log(`\n✅ [setup] Environment ready (PostgreSQL :${dbPort}/${dbName}, Redis :${redisPort}, fully seeded)`);
console.log('   Next: npm run start:dev');
console.log('   Creds: docs/development/SEEDING.md\n');
