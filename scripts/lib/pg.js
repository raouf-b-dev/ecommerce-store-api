'use strict';

const { spawnSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_CONTAINER_NAME = 'postgres-db';
const DUMP_PREFIX = 'ecommerce-store-api_';

/**
 * Resolve PostgreSQL connection settings from the ecommerce `DB_*` env contract.
 */
function getDbConfig(overrides = {}) {
  return {
    host: overrides.host || process.env.DB_HOST || 'localhost',
    port: String(overrides.port || process.env.DB_PORT || '5432'),
    username: overrides.username || process.env.DB_USERNAME || 'postgres',
    password: overrides.password || process.env.DB_PASSWORD || 'postgres',
    database: overrides.database || process.env.DB_DATABASE || 'ecommerce_db',
    containerName:
      overrides.containerName ||
      process.env.POSTGRES_CONTAINER_NAME ||
      DEFAULT_CONTAINER_NAME,
  };
}

function pgEnv(config) {
  return { ...process.env, PGPASSWORD: config.password };
}

/**
 * Return the running Docker container name if it matches, otherwise null.
 */
function detectDockerContainer(containerName) {
  try {
    const result = spawnSync('docker', ['ps', '--format', '{{.Names}}'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (result.status !== 0 || !result.stdout) {
      return null;
    }
    const names = result.stdout
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter(Boolean);
    return names.includes(containerName) ? containerName : null;
  } catch {
    return null;
  }
}

function assertOk(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || '').toString().trim();
    throw new Error(
      `${label} failed (exit ${result.status})${stderr ? `: ${stderr}` : ''}`,
    );
  }
}

/**
 * Run pg_dump (-Fc) and return a Buffer of the custom-format dump.
 * Prefers docker exec when the Postgres container is running.
 */
function runPgDump(config = getDbConfig()) {
  const container = detectDockerContainer(config.containerName);
  const env = pgEnv(config);

  if (container) {
    const result = spawnSync(
      'docker',
      [
        'exec',
        '-e',
        'PGPASSWORD',
        container,
        'pg_dump',
        '-U',
        config.username,
        '-d',
        config.database,
        '-Fc',
      ],
      {
        env,
        encoding: null,
        maxBuffer: 500 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    assertOk(result, 'pg_dump (docker)');
    return { buffer: result.stdout, via: `docker:${container}` };
  }

  const result = spawnSync(
    'pg_dump',
    [
      '-h',
      config.host,
      '-p',
      config.port,
      '-U',
      config.username,
      '-d',
      config.database,
      '-Fc',
    ],
    {
      env,
      encoding: null,
      maxBuffer: 500 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  assertOk(result, 'pg_dump (local)');
  return { buffer: result.stdout, via: 'local' };
}

/**
 * List custom-format dump contents (sanity check). Returns stdout text.
 */
function listDump(dumpPath, config = getDbConfig()) {
  const container = detectDockerContainer(config.containerName);
  const env = pgEnv(config);
  const absPath = path.resolve(dumpPath);

  if (container) {
    const containerDumpPath = `/tmp/${path.basename(absPath)}.list-check`;
    execFileSync('docker', [
      'cp',
      absPath,
      `${container}:${containerDumpPath}`,
    ]);
    try {
      const result = spawnSync(
        'docker',
        [
          'exec',
          '-e',
          'PGPASSWORD',
          container,
          'pg_restore',
          '--list',
          containerDumpPath,
        ],
        { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      assertOk(result, 'pg_restore --list (docker)');
      return result.stdout;
    } finally {
      spawnSync('docker', ['exec', container, 'rm', '-f', containerDumpPath], {
        stdio: 'ignore',
      });
    }
  }

  const result = spawnSync('pg_restore', ['--list', absPath], {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assertOk(result, 'pg_restore --list (local)');
  return result.stdout;
}

/**
 * Restore a custom-format dump into the configured database.
 */
function runPgRestore(dumpPath, config = getDbConfig()) {
  const container = detectDockerContainer(config.containerName);
  const env = pgEnv(config);
  const absPath = path.resolve(dumpPath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Dump file does not exist: ${absPath}`);
  }

  if (container) {
    const containerDumpPath = `/tmp/${path.basename(absPath)}`;
    execFileSync('docker', [
      'cp',
      absPath,
      `${container}:${containerDumpPath}`,
    ]);
    try {
      const result = spawnSync(
        'docker',
        [
          'exec',
          '-e',
          'PGPASSWORD',
          container,
          'pg_restore',
          '-U',
          config.username,
          '-d',
          config.database,
          '--clean',
          '--if-exists',
          '--no-owner',
          containerDumpPath,
        ],
        { env, encoding: 'utf8', stdio: ['ignore', 'inherit', 'inherit'] },
      );
      // pg_restore may exit 1 with non-fatal warnings when --clean hits missing objects
      if (result.error) {
        throw result.error;
      }
      if (result.status !== 0 && result.status !== 1) {
        throw new Error(`pg_restore (docker) failed (exit ${result.status})`);
      }
      return { via: `docker:${container}` };
    } finally {
      spawnSync('docker', ['exec', container, 'rm', '-f', containerDumpPath], {
        stdio: 'ignore',
      });
    }
  }

  const result = spawnSync(
    'pg_restore',
    [
      '-h',
      config.host,
      '-p',
      config.port,
      '-U',
      config.username,
      '-d',
      config.database,
      '--clean',
      '--if-exists',
      '--no-owner',
      absPath,
    ],
    { env, encoding: 'utf8', stdio: ['ignore', 'inherit', 'inherit'] },
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`pg_restore (local) failed (exit ${result.status})`);
  }
  return { via: 'local' };
}

/**
 * Execute a SQL statement via psql (docker or local).
 * Pass `{ tuplesOnly: true }` for `-tAc` (scalar / machine-readable) output.
 */
function runPsql(
  sql,
  config = getDbConfig(),
  { database, tuplesOnly = false } = {},
) {
  const targetDb = database || config.database;
  const container = detectDockerContainer(config.containerName);
  const env = pgEnv(config);
  const psqlTail = tuplesOnly
    ? ['-v', 'ON_ERROR_STOP=1', '-tAc', sql]
    : ['-v', 'ON_ERROR_STOP=1', '-c', sql];

  if (container) {
    const result = spawnSync(
      'docker',
      [
        'exec',
        '-e',
        'PGPASSWORD',
        '-i',
        container,
        'psql',
        '-U',
        config.username,
        '-d',
        targetDb,
        ...psqlTail,
      ],
      { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    assertOk(result, 'psql (docker)');
    return result.stdout;
  }

  const result = spawnSync(
    'psql',
    [
      '-h',
      config.host,
      '-p',
      config.port,
      '-U',
      config.username,
      '-d',
      targetDb,
      ...psqlTail,
    ],
    { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  assertOk(result, 'psql (local)');
  return result.stdout;
}

/**
 * Run SQL and parse a single integer (uses psql -tAc).
 */
function queryScalarInt(sql, config = getDbConfig(), options = {}) {
  const raw = runPsql(sql, config, { ...options, tuplesOnly: true }).trim();
  const value = parseInt(raw, 10);
  return Number.isFinite(value) ? value : NaN;
}

/**
 * Assert required public tables exist; throws with a missing-list.
 */
function assertRequiredTables(
  requiredTables,
  config = getDbConfig(),
  options = {},
) {
  const list = requiredTables.map((t) => `'${t}'`).join(', ');
  const raw = runPsql(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN (${list})
     ORDER BY 1`,
    config,
    { ...options, tuplesOnly: true },
  );
  const present = new Set(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const missing = requiredTables.filter((t) => !present.has(t));
  if (missing.length > 0) {
    throw new Error(`Restore missing required tables: ${missing.join(', ')}`);
  }
  return [...present];
}

/**
 * Drop and recreate a database (connects to `postgres` maintenance DB).
 */
function recreateDatabase(databaseName, config = getDbConfig()) {
  const safeName = databaseName.replace(/[^a-zA-Z0-9_]/g, '');
  if (safeName !== databaseName) {
    throw new Error(`Unsafe database name: ${databaseName}`);
  }
  if (databaseName === config.database) {
    throw new Error(
      `Refusing to recreate the primary database '${config.database}'. Use a disposable name.`,
    );
  }

  const maintenance = { ...config, database: 'postgres' };
  runPsql(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${safeName}' AND pid <> pg_backend_pid();`,
    maintenance,
    { database: 'postgres' },
  );
  runPsql(`DROP DATABASE IF EXISTS ${safeName};`, maintenance, {
    database: 'postgres',
  });
  runPsql(`CREATE DATABASE ${safeName};`, maintenance, {
    database: 'postgres',
  });
}

function ensureBackupsDir() {
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  return backupsDir;
}

function defaultDumpFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${DUMP_PREFIX}${timestamp}.dump`;
}

function findLatestDump(backupsDir = path.join(process.cwd(), 'backups')) {
  if (!fs.existsSync(backupsDir)) {
    return null;
  }
  const dumpFiles = fs
    .readdirSync(backupsDir)
    .filter((f) => f.endsWith('.dump'))
    .map((f) => ({
      name: f,
      path: path.join(backupsDir, f),
      mtime: fs.statSync(path.join(backupsDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);
  return dumpFiles[0] || null;
}

function applyRetention(backupsDir, retainCount, prefix = DUMP_PREFIX) {
  if (retainCount <= 0) {
    return;
  }
  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.dump'))
    .map((f) => ({
      name: f,
      path: path.join(backupsDir, f),
      mtime: fs.statSync(path.join(backupsDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length <= retainCount) {
    return;
  }
  for (const file of files.slice(retainCount)) {
    fs.unlinkSync(file.path);
    console.log(
      `🧹 [db-backup] Retained last ${retainCount} backups. Cleaned: ${file.name}`,
    );
  }
}

/**
 * Write a dump buffer to outputPath, validate with pg_restore --list.
 * Writes next to the destination first (avoids cross-device rename failures).
 */
function writeAndValidateDump(buffer, outputPath, config = getDbConfig()) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Backup produced an empty dump (0 bytes)');
  }

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpPath = path.join(dir, `.ecom-dump-validate-${Date.now()}.dump.tmp`);
  try {
    fs.writeFileSync(tmpPath, buffer);
    listDump(tmpPath, config);
    fs.copyFileSync(tmpPath, outputPath);
    fs.unlinkSync(tmpPath);
  } catch (err) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch {
      /* ignore */
    }
    throw err;
  }

  return fs.statSync(outputPath);
}

/**
 * Parse a single integer from typical `psql` aligned output (header + value).
 */
function parsePsqlInt(output) {
  const countLine = String(output || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^\d+$/.test(line));
  return countLine ? parseInt(countLine, 10) : NaN;
}

module.exports = {
  DUMP_PREFIX,
  DEFAULT_CONTAINER_NAME,
  getDbConfig,
  detectDockerContainer,
  runPgDump,
  runPgRestore,
  listDump,
  runPsql,
  recreateDatabase,
  ensureBackupsDir,
  defaultDumpFilename,
  findLatestDump,
  applyRetention,
  writeAndValidateDump,
  parsePsqlInt,
  queryScalarInt,
  assertRequiredTables,
};
