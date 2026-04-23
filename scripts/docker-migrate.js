#!/usr/bin/env node
// scripts/docker-migrate.js
// ─────────────────────────────────────────────────────────────────────────────
// Self-contained migration runner for Docker production containers.
//
// Usage: NODE_ENV=production node scripts/docker-migrate.js
// ─────────────────────────────────────────────────────────────────────────────
const { DataSource } = require('typeorm');
const { join } = require('path');

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  logging: ['error'],
  migrations: [join(__dirname, '..', 'dist', '**', 'migrations', '*.js')],
  migrationsTableName: 'typeorm_migrations',
});

ds.initialize()
  .then(() => ds.runMigrations())
  .then((migrations) => {
    console.log(`✅ Ran ${migrations.length} migration(s)`);
    return ds.destroy();
  })
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
