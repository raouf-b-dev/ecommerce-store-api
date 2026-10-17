#!/usr/bin/env node
// Creates .env.development/.env.production/.env.staging/.env.test from .env.example
// Also creates .secrets from .secrets.example with local/CI-ready dev defaults
//
// Usage:
//   node scripts/generate-envs.js
//   node scripts/generate-envs.js --envs=development,staging
//   node scripts/generate-envs.js --secrets-only
//   node scripts/generate-envs.js --from=.env.example --fromSecrets=.secrets.example --overwrite
//   node scripts/generate-envs.js --merge
//   npm run env:init -- --overwrite
//   npm run env:init:merge

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { generateKeyPairSync } = crypto;
const dotenv = require('dotenv');
const { parseArgs } = require('./lib/cli');

const RSA_MODULUS_LENGTH = 4096;

function generatePEM() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: RSA_MODULUS_LENGTH,
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  return privateKey;
}

function toDotenvEscaped(pem) {
  return `"${pem.replace(/\r?\n/g, '\\n')}"`;
}

// Base64 of raw PEM - paste verbatim into GitHub Secrets; CI decodes before writing .env.test
function toPortableSecret(pem) {
  return Buffer.from(pem, 'utf8').toString('base64');
}

async function readTemplate(file) {
  const raw = await fsp.readFile(file, 'utf8').catch(() => '');
  return raw.split(/\r?\n/);
}

function isKV(line) {
  return /^[A-Za-z_][A-Za-z0-9_]*=/.test(line);
}

function keyOf(line) {
  return line.split('=')[0];
}

function buildLinesForEnv(lines, envName, pkgVersion) {
  const isProdLike = envName === 'production' || envName === 'staging';

  return lines.map((line) => {
    if (!isKV(line)) return line;
    const key = keyOf(line);

    if (key === 'NODE_ENV') return `NODE_ENV=${envName}`;
    if (key === 'APP_VERSION') return `APP_VERSION=${pkgVersion}`;
    if (key === 'REDIS_KEYPREFIX') return `REDIS_KEYPREFIX=ecom:${envName}:`;

    if (key === 'TRUST_PROXY') {
      if (envName === 'production' || envName === 'staging')
        return 'TRUST_PROXY=1';
      return 'TRUST_PROXY=false';
    }

    if (key === 'PUBLIC_BASE_URL' && isProdLike) {
      return 'PUBLIC_BASE_URL=';
    }

    if (key === 'IS_DB_SYNCHRONIZE') {
      return isProdLike ? 'IS_DB_SYNCHRONIZE=false' : 'IS_DB_SYNCHRONIZE=true';
    }

    if (key === 'LOG_LEVEL') {
      if (envName === 'development') return 'LOG_LEVEL=debug';
      return 'LOG_LEVEL=info';
    }

    if (key === 'PAYMENT_MOCK_AUTO_COMPLETE') {
      if (envName === 'development' || envName === 'staging') {
        return 'PAYMENT_MOCK_AUTO_COMPLETE=true';
      }
      return 'PAYMENT_MOCK_AUTO_COMPLETE=false';
    }

    if (key === 'OTEL_TRACING_ENABLED') {
      if (envName === 'production' || envName === 'staging') {
        return 'OTEL_TRACING_ENABLED=false';
      }
      return 'OTEL_TRACING_ENABLED=true';
    }

    if (key === 'SWAGGER_ENABLED') {
      if (envName === 'production') return 'SWAGGER_ENABLED=false';
      return 'SWAGGER_ENABLED=true';
    }

    if (key === 'JWT_PRIVATE_KEY') {
      return `JWT_PRIVATE_KEY=${toDotenvEscaped(generatePEM())}`;
    }

    if (key === 'METRICS_API_KEY') {
      return `METRICS_API_KEY=${crypto.randomBytes(32).toString('hex')}`;
    }

    if (key === 'GRAFANA_ADMIN_PASSWORD') {
      return `GRAFANA_ADMIN_PASSWORD=${crypto.randomBytes(16).toString('hex')}`;
    }

    return line;
  });
}

function buildLinesForSecrets(lines) {
  return lines.map((line) => {
    if (!isKV(line)) return line;
    const key = keyOf(line);

    if (key === 'CI_DB_USERNAME') return 'CI_DB_USERNAME=postgres';
    if (key === 'CI_DB_PASSWORD') return 'CI_DB_PASSWORD=postgres';
    if (key === 'CI_DB_DATABASE') return 'CI_DB_DATABASE=test_db';
    if (key === 'CI_REDIS_PASSWORD') return 'CI_REDIS_PASSWORD=secret';
    if (key === 'CI_REDIS_KEYPREFIX') return 'CI_REDIS_KEYPREFIX=ecom:test:';

    if (key === 'CI_JWT_PRIVATE_KEY') {
      return `CI_JWT_PRIVATE_KEY=${toPortableSecret(generatePEM())}`;
    }

    if (key === 'CI_METRICS_API_KEY') {
      return `CI_METRICS_API_KEY=${crypto.randomBytes(32).toString('hex')}`;
    }

    return line;
  });
}

async function writeFile(targetPath, contentLines) {
  await fsp.writeFile(targetPath, contentLines.join('\n'), {
    encoding: 'utf8',
    flag: 'w',
  });
}

function missingTemplateLines(raw, templateLines) {
  const existing = dotenv.parse(raw);
  return templateLines.filter(
    (line) => isKV(line) && !Object.hasOwn(existing, keyOf(line)),
  );
}

function newlineFor(raw) {
  return raw.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * @param {{ argv?: string[], cwd?: string, log?: { log: Function, error: Function } }} [options]
 * @returns {Promise<number>} exit code
 */
async function generateEnvs({ argv, cwd = process.cwd(), log = console } = {}) {
  const args = parseArgs(argv);

  const ENV_LIST = (args.envs || 'development,production,staging,test')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const ENV_TEMPLATE = args.from || '.env.example';
  const SECRETS_TEMPLATE = args.fromSecrets || '.secrets.example';
  const FORCE = Boolean(args.overwrite || args.force);
  const MERGE = Boolean(args.merge);
  const SECRETS_ONLY = Boolean(args.secretsOnly || args['secrets-only']);

  if (MERGE && (FORCE || SECRETS_ONLY)) {
    log.error(
      'Error: --merge cannot be combined with --overwrite/--force or --secrets-only.',
    );
    return 1;
  }

  const missingByFile = [];
  const pkgVersion = require(path.resolve(cwd, 'package.json')).version;

  if (!SECRETS_ONLY) {
    const envTemplatePath = path.resolve(cwd, ENV_TEMPLATE);
    const envTemplateLines = await readTemplate(envTemplatePath);

    if (envTemplateLines.length === 0) {
      log.error(`⚠️  Env template not found or empty: ${ENV_TEMPLATE}`);
    } else {
      for (const env of ENV_LIST) {
        const outName = `.env.${env}`;
        const outPath = path.resolve(cwd, outName);

        const exists = fs.existsSync(outPath);
        if (exists && !FORCE) {
          const raw = await fsp.readFile(outPath, 'utf8');
          const missing = missingTemplateLines(raw, envTemplateLines);

          if (missing.length === 0) {
            log.log(
              `⏭️  Skipping ${outName} (exists). Use --overwrite to overwrite.`,
            );
            continue;
          }

          if (!MERGE) {
            missingByFile.push({ file: outName, keys: missing.map(keyOf) });
            continue;
          }

          const nl = newlineFor(raw);
          const generated = buildLinesForEnv(missing, env, pkgVersion);
          const header = `# Added by env:init --merge (${new Date().toISOString()})`;
          let block = [header, ...generated].join(nl) + nl;
          if (raw.length > 0 && !raw.endsWith('\n')) {
            block = nl + block;
          }

          await fsp.appendFile(outPath, block, 'utf8');
          log.log(`Merged ${missing.length} key(s) into ${outName}`);
          continue;
        }

        const lines = buildLinesForEnv(envTemplateLines, env, pkgVersion);
        await writeFile(outPath, lines);

        log.log(`${exists ? '♻️  Overwrote' : '✅ Created'} ${outName}`);
      }
    }
  }

  const secretsTemplatePath = path.resolve(cwd, SECRETS_TEMPLATE);
  const secretsTemplateLines = await readTemplate(secretsTemplatePath);

  if (secretsTemplateLines.length === 0) {
    log.error(`⚠️  Secrets template not found or empty: ${SECRETS_TEMPLATE}`);
  } else {
    const outSecrets = `.secrets`;
    const outSecretsPath = path.resolve(cwd, outSecrets);

    const exists = fs.existsSync(outSecretsPath);
    if (exists && !FORCE) {
      log.log(
        `⏭️  Skipping ${outSecrets} (exists). Use --overwrite to overwrite.`,
      );

      const raw = await fsp.readFile(outSecretsPath, 'utf8');
      const missing = missingTemplateLines(raw, secretsTemplateLines).map(
        keyOf,
      );
      if (missing.length > 0) {
        log.error(
          `⚠️  .secrets is missing keys: ${missing.join(', ')}. Copy the missing keys from .secrets.example into .secrets by hand. npm run env:init:secrets -- --overwrite regenerates the whole file: it replaces CI_JWT_PRIVATE_KEY and CI_METRICS_API_KEY and clears CODECOV_TOKEN, so update GitHub Secrets afterwards.`,
        );
      }
    } else {
      const lines = buildLinesForSecrets(secretsTemplateLines);

      await writeFile(outSecretsPath, lines);
      log.log(`${exists ? '♻️  Overwrote' : '✅ Created'} ${outSecrets}`);
      log.log(
        `   → Copy CI_JWT_PRIVATE_KEY and CI_METRICS_API_KEY into GitHub Secrets as-is.`,
      );
    }
  }

  if (missingByFile.length > 0) {
    log.error('Environment files are missing keys from the templates:');
    for (const { file, keys } of missingByFile) {
      log.error(`  ${file}: ${keys.join(', ')}`);
    }
    log.error(
      'Run npm run env:init:merge to append missing keys, or npm run env:init:force to regenerate.',
    );
    return 1;
  }

  return 0;
}

module.exports = { generateEnvs };

if (require.main === module) {
  generateEnvs().then((code) => {
    process.exitCode = code;
  });
}
