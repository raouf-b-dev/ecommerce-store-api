#!/usr/bin/env node
// Creates .env.development/.env.production/.env.staging/.env.test from .env.example
// Also creates .secrets from .secrets.example
//
// Usage:
//   node scripts/generate-envs.js
//   node scripts/generate-envs.js --envs=development,staging
//   node scripts/generate-envs.js --from=.env.example --fromSecrets=.secrets.example --force
//   npm run env:init -- --force

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { generateKeyPairSync } = require('crypto');

const args = process.argv.slice(2).reduce((acc, a) => {
  const [k, v] = a.startsWith('--') ? a.slice(2).split('=') : [a, true];
  acc[k] = v === undefined ? true : v;
  return acc;
}, {});

const ENV_LIST = (args.envs || 'development,production,staging,test')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ENV_TEMPLATE = args.from || '.env.example';
const SECRETS_TEMPLATE = args.fromSecrets || '.secrets.example';
const FORCE = Boolean(args.force);

// Helpers
function generateRSAPrivateKey() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  return `"${privateKey.replace(/\r?\n/g, '\\n')}"`;
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

function buildLinesForEnv(lines, envName) {
  return lines.map((line) => {
    if (!isKV(line)) return line;
    const key = keyOf(line);

    // Keep defaults from .env.example for local dev/test — works out of the box
    if (envName === 'development' || envName === 'test') {
      if (key === 'NODE_ENV') return `NODE_ENV=${envName}`;
      if (key === 'REDIS_KEYPREFIX') return `REDIS_KEYPREFIX=ecom:${envName}:`;
      if (key === 'IS_DB_SYNCHRONIZE') return 'IS_DB_SYNCHRONIZE=true';
      if (key === 'LOG_LEVEL')
        return envName === 'development' ? 'LOG_LEVEL=debug' : 'LOG_LEVEL=info';
      if (key === 'JWT_PRIVATE_KEY')
        return `JWT_PRIVATE_KEY=${generateRSAPrivateKey()}`;

      return line; // preserve .env.example values
    }

    // For production/staging — blank credentials, force manual configuration
    switch (key) {
      case 'NODE_ENV':
        return `NODE_ENV=${envName}`;
      case 'REDIS_KEYPREFIX':
        return `REDIS_KEYPREFIX=ecom:${envName}:`;
      case 'IS_DB_SYNCHRONIZE':
        return `IS_DB_SYNCHRONIZE=false`;
      case 'LOG_LEVEL':
        return `LOG_LEVEL=info`;
      default:
        return `${key}=`;
    }
  });
}

async function writeFile(targetPath, contentLines) {
  await fsp.writeFile(targetPath, contentLines.join('\n'), {
    encoding: 'utf8',
    flag: 'w',
  });
}

// MAIN
(async () => {
  // ENV files
  const envTemplatePath = path.resolve(process.cwd(), ENV_TEMPLATE);
  const envTemplateLines = await readTemplate(envTemplatePath);

  if (envTemplateLines.length === 0) {
    console.error(`⚠️  Env template not found or empty: ${ENV_TEMPLATE}`);
  } else {
    for (const env of ENV_LIST) {
      const outName = `.env.${env}`;
      const outPath = path.resolve(process.cwd(), outName);

      const exists = fs.existsSync(outPath);
      if (exists && !FORCE) {
        console.log(
          `⏭️  Skipping ${outName} (exists). Use --force to overwrite.`,
        );
        continue;
      }

      const lines = buildLinesForEnv(envTemplateLines, env);
      await writeFile(outPath, lines);

      console.log(`${exists ? '♻️  Overwrote' : '✅ Created'} ${outName}`);
    }
  }

  // SECRETS file
  const secretsTemplatePath = path.resolve(process.cwd(), SECRETS_TEMPLATE);
  const secretsTemplateLines = await readTemplate(secretsTemplatePath);

  if (secretsTemplateLines.length === 0) {
    console.error(
      `⚠️  Secrets template not found or empty: ${SECRETS_TEMPLATE}`,
    );
  } else {
    const outSecrets = `.secrets`;
    const outSecretsPath = path.resolve(process.cwd(), outSecrets);

    const exists = fs.existsSync(outSecretsPath);
    if (exists && !FORCE) {
      console.log(
        `⏭️  Skipping ${outSecrets} (exists). Use --force to overwrite.`,
      );
    } else {
      // Keep keys from template, blank values to force filling
      const lines = secretsTemplateLines.map((line) =>
        isKV(line) ? `${keyOf(line)}=` : line,
      );

      await writeFile(outSecretsPath, lines);
      console.log(`${exists ? '♻️  Overwrote' : '✅ Created'} ${outSecrets}`);
    }
  }
})();
