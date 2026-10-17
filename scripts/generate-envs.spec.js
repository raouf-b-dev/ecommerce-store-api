'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const { generateEnvs } = require('./generate-envs');

function silentLog() {
  const lines = [];
  return {
    lines,
    log(message) {
      lines.push(String(message));
    },
    error(message) {
      lines.push(String(message));
    },
  };
}

async function makeCwd({
  envExample = 'NODE_ENV=development\nFOO=bar\n',
  secretsExample = 'CI_DB_USERNAME=\nCI_DB_PASSWORD=\n',
} = {}) {
  const cwd = await fsp.mkdtemp(path.join(os.tmpdir(), 'generate-envs-'));
  await fsp.writeFile(
    path.join(cwd, 'package.json'),
    JSON.stringify({ name: 'fixture', version: '1.2.3' }),
    'utf8',
  );
  await fsp.writeFile(path.join(cwd, '.env.example'), envExample, 'utf8');
  await fsp.writeFile(
    path.join(cwd, '.secrets.example'),
    secretsExample,
    'utf8',
  );
  return cwd;
}

async function read(cwd, name) {
  return fsp.readFile(path.join(cwd, name), 'utf8');
}

describe('generateEnvs', () => {
  let cwd;

  afterEach(async () => {
    if (cwd) {
      await fsp.rm(cwd, { recursive: true, force: true });
      cwd = undefined;
    }
  });

  it('returns 1 and lists missing keys per file when templates add keys', async () => {
    cwd = await makeCwd({
      envExample: 'NODE_ENV=development\nNEW_KEY=value\nFOO=bar\n',
    });
    await fsp.writeFile(
      path.join(cwd, '.env.development'),
      'NODE_ENV=development\nFOO=keep-me\n',
      'utf8',
    );
    await fsp.writeFile(
      path.join(cwd, '.env.production'),
      'NODE_ENV=production\nFOO=keep-me\n',
      'utf8',
    );
    await fsp.writeFile(
      path.join(cwd, '.env.staging'),
      'NODE_ENV=staging\nFOO=keep-me\nNEW_KEY=already\n',
      'utf8',
    );
    await fsp.writeFile(
      path.join(cwd, '.secrets'),
      'CI_DB_USERNAME=postgres\n',
      'utf8',
    );

    const log = silentLog();
    const code = await generateEnvs({
      argv: ['--envs=development,production,staging,test'],
      cwd,
      log,
    });

    assert.equal(code, 1);
    const joined = log.lines.join('\n');
    assert.match(joined, /\.env\.development: NEW_KEY/);
    assert.match(joined, /\.env\.production: NEW_KEY/);
    assert.doesNotMatch(joined, /\.env\.staging:/);
    assert.match(joined, /Created \.env\.test/);
    assert.equal(fs.existsSync(path.join(cwd, '.env.test')), true);
    assert.match(joined, /\.secrets is missing keys: CI_DB_PASSWORD/);
    assert.match(joined, /npm run env:init:secrets -- --overwrite/);
    assert.match(joined, /env:init:merge/);
    assert.match(joined, /env:init:force/);
    assert.equal(
      await read(cwd, '.env.development'),
      'NODE_ENV=development\nFOO=keep-me\n',
    );
  });

  it('merge appends only missing keys and keeps existing secret values', async () => {
    cwd = await makeCwd({
      envExample:
        'NODE_ENV=development\nJWT_PRIVATE_KEY=\nMETRICS_API_KEY=\nNEW_KEY=from-template\n',
    });
    const existing =
      'NODE_ENV=development\nJWT_PRIVATE_KEY="KEEP_JWT"\nMETRICS_API_KEY=keep-metrics\n';
    await fsp.writeFile(path.join(cwd, '.env.development'), existing, 'utf8');
    await fsp.writeFile(
      path.join(cwd, '.secrets'),
      'CI_DB_USERNAME=postgres\nCI_DB_PASSWORD=postgres\n',
      'utf8',
    );
    const secretsBefore = await read(cwd, '.secrets');

    const log = silentLog();
    const code = await generateEnvs({
      argv: ['--merge', '--envs=development'],
      cwd,
      log,
    });

    assert.equal(code, 0);
    const after = await read(cwd, '.env.development');
    assert.match(after, /^NODE_ENV=development$/m);
    assert.match(after, /^JWT_PRIVATE_KEY="KEEP_JWT"$/m);
    assert.match(after, /^METRICS_API_KEY=keep-metrics$/m);
    assert.match(after, /^NEW_KEY=from-template$/m);
    assert.match(after, /# Added by env:init --merge \(/);
    assert.match(
      log.lines.join('\n'),
      /Merged 1 key\(s\) into \.env\.development/,
    );
    assert.equal(await read(cwd, '.secrets'), secretsBefore);
  });

  it('merge into a CRLF file without a trailing newline keeps CRLF and starts on a new line', async () => {
    cwd = await makeCwd({
      envExample: 'NODE_ENV=development\nFOO=bar\nNEW_KEY=added\n',
    });
    await fsp.writeFile(
      path.join(cwd, '.env.development'),
      'NODE_ENV=development\r\nFOO=keep',
      'utf8',
    );
    await fsp.writeFile(
      path.join(cwd, '.secrets'),
      'CI_DB_USERNAME=postgres\nCI_DB_PASSWORD=postgres\n',
      'utf8',
    );

    const code = await generateEnvs({
      argv: ['--merge', '--envs=development'],
      cwd,
      log: silentLog(),
    });

    assert.equal(code, 0);
    const after = await read(cwd, '.env.development');
    assert.ok(after.includes('\r\n'), 'expected CRLF line endings');
    assert.match(after, /FOO=keep\r\n# Added by env:init --merge/);
    assert.match(after, /\r\nNEW_KEY=added\r\n/);
  });

  it('merge leaves .secrets untouched even when secrets template has extra keys', async () => {
    cwd = await makeCwd({
      envExample: 'NODE_ENV=development\nFOO=bar\n',
      secretsExample: 'CI_DB_USERNAME=\nCI_DB_PASSWORD=\nCI_EXTRA=\n',
    });
    await fsp.writeFile(
      path.join(cwd, '.env.development'),
      'NODE_ENV=development\nFOO=bar\n',
      'utf8',
    );
    const secretsBody = 'CI_DB_USERNAME=postgres\nCI_DB_PASSWORD=postgres\n';
    await fsp.writeFile(path.join(cwd, '.secrets'), secretsBody, 'utf8');

    const log = silentLog();
    const code = await generateEnvs({
      argv: ['--merge', '--envs=development'],
      cwd,
      log,
    });

    assert.equal(code, 0);
    assert.equal(await read(cwd, '.secrets'), secretsBody);
    const joined = log.lines.join('\n');
    assert.match(joined, /\.secrets is missing keys: CI_EXTRA/);
    assert.match(joined, /npm run env:init:secrets -- --overwrite/);
  });

  it('overwrite regenerates existing env files', async () => {
    cwd = await makeCwd({
      envExample: 'NODE_ENV=development\nFOO=from-template\n',
    });
    await fsp.writeFile(
      path.join(cwd, '.env.development'),
      'NODE_ENV=development\nFOO=old\nEXTRA=stays-not\n',
      'utf8',
    );
    await fsp.writeFile(
      path.join(cwd, '.secrets'),
      'CI_DB_USERNAME=old\nCI_DB_PASSWORD=old\n',
      'utf8',
    );

    const log = silentLog();
    const code = await generateEnvs({
      argv: ['--overwrite', '--envs=development'],
      cwd,
      log,
    });

    assert.equal(code, 0);
    const env = await read(cwd, '.env.development');
    assert.match(env, /^FOO=from-template$/m);
    assert.doesNotMatch(env, /EXTRA=/);
    assert.match(log.lines.join('\n'), /Overwrote \.env\.development/);
    const secrets = await read(cwd, '.secrets');
    assert.match(secrets, /^CI_DB_USERNAME=postgres$/m);
  });

  it('rejects --merge together with --overwrite and changes nothing', async () => {
    cwd = await makeCwd();
    const before = 'NODE_ENV=development\nFOO=keep\n';
    await fsp.writeFile(path.join(cwd, '.env.development'), before, 'utf8');
    await fsp.writeFile(
      path.join(cwd, '.secrets'),
      'CI_DB_USERNAME=postgres\nCI_DB_PASSWORD=postgres\n',
      'utf8',
    );
    const secretsBefore = await read(cwd, '.secrets');

    const log = silentLog();
    const code = await generateEnvs({
      argv: ['--merge', '--overwrite', '--envs=development'],
      cwd,
      log,
    });

    assert.equal(code, 1);
    assert.match(log.lines.join('\n'), /--merge cannot be combined/);
    assert.equal(await read(cwd, '.env.development'), before);
    assert.equal(await read(cwd, '.secrets'), secretsBefore);
  });

  it('treats export KEY= as present and leaves the file unchanged on merge', async () => {
    cwd = await makeCwd({
      envExample: 'NODE_ENV=development\nFOO=bar\n',
    });
    const existing = 'NODE_ENV=development\nexport FOO=keep\n';
    await fsp.writeFile(path.join(cwd, '.env.development'), existing, 'utf8');
    await fsp.writeFile(
      path.join(cwd, '.secrets'),
      'CI_DB_USERNAME=postgres\nCI_DB_PASSWORD=postgres\n',
      'utf8',
    );

    const checkLog = silentLog();
    const checkCode = await generateEnvs({
      argv: ['--envs=development'],
      cwd,
      log: checkLog,
    });
    assert.equal(checkCode, 0);
    assert.equal(await read(cwd, '.env.development'), existing);

    const mergeLog = silentLog();
    const mergeCode = await generateEnvs({
      argv: ['--merge', '--envs=development'],
      cwd,
      log: mergeLog,
    });
    assert.equal(mergeCode, 0);
    assert.equal(await read(cwd, '.env.development'), existing);
  });

  it('merge twice leaves a single merge header and skips on the second run', async () => {
    cwd = await makeCwd({
      envExample: 'NODE_ENV=development\nFOO=bar\nNEW_KEY=added\n',
    });
    await fsp.writeFile(
      path.join(cwd, '.env.development'),
      'NODE_ENV=development\nFOO=keep\n',
      'utf8',
    );
    await fsp.writeFile(
      path.join(cwd, '.secrets'),
      'CI_DB_USERNAME=postgres\nCI_DB_PASSWORD=postgres\n',
      'utf8',
    );

    const first = silentLog();
    assert.equal(
      await generateEnvs({
        argv: ['--merge', '--envs=development'],
        cwd,
        log: first,
      }),
      0,
    );

    const second = silentLog();
    assert.equal(
      await generateEnvs({
        argv: ['--merge', '--envs=development'],
        cwd,
        log: second,
      }),
      0,
    );

    assert.match(
      second.lines.join('\n'),
      /Skipping \.env\.development \(exists\)/,
    );
    const after = await read(cwd, '.env.development');
    assert.equal((after.match(/# Added by env:init --merge/g) || []).length, 1);
  });
});
