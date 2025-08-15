#!/usr/bin/env node
// Creates .env.development/.env.production/.env.staging/.env.test from .env.example
// Usage:
//   node scripts/generate-envs.js                  # all envs, blanking values except NODE_ENV & REDIS_KEYPREFIX
//   node scripts/generate-envs.js --envs=development,staging
//   node scripts/generate-envs.js --from=.env.example --force
//   npm run env:init -- --force                    # via package.json script

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const args = process.argv.slice(2).reduce((acc, a) => {
  const [k, v] = a.startsWith('--') ? a.slice(2).split('=') : [a, true];
  acc[k] = v === undefined ? true : v;
  return acc;
}, {});

const ENV_LIST = (args.envs || 'development,production,staging,test')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const TEMPLATE = args.from || '.env.example';
const FORCE = Boolean(args.force);

// read template lines, keep order and comments
async function readTemplate(file) {
  const raw = await fsp.readFile(file, 'utf8').catch(() => '');
  return raw.split(/\r?\n/);
}

function isKV(line) {
  // KEY=VALUE (ignore comments/blank)
  return /^[A-Za-z_][A-Za-z0-9_]*=/.test(line);
}

function keyOf(line) {
  return line.split('=')[0];
}

function buildLinesForEnv(lines, envName) {
  return lines.map((line) => {
    if (!isKV(line)) return line; // keep comments/blank lines as-is
    const key = keyOf(line);

    // by default, blank values but provide sensible env-specific defaults
    switch (key) {
      case 'NODE_ENV':
        return `NODE_ENV=${envName}`;
      case 'REDIS_KEYPREFIX':
        return `REDIS_KEYPREFIX=ecom:${envName}:`;
      case 'PORT':
        // Keep dev/test default 3000; leave others blank if you prefer: change as needed
        return envName === 'development' || envName === 'test'
          ? 'PORT=3000'
          : 'PORT=';
      default:
        // blank everything else to force developers to think about values
        return `${key}=`;
    }
  });
}

async function writeEnvFile(targetPath, contentLines) {
  await fsp.writeFile(targetPath, contentLines.join('\n'), {
    encoding: 'utf8',
    flag: 'w',
  });
}

(async () => {
  const templatePath = path.resolve(process.cwd(), TEMPLATE);
  const templateLines = await readTemplate(templatePath);

  if (templateLines.length === 0) {
    console.error(`⚠️  Template not found or empty: ${TEMPLATE}`);
    process.exit(1);
  }

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

    const lines = buildLinesForEnv(templateLines, env);
    await writeEnvFile(outPath, lines);

    console.log(`${exists ? '♻️  Overwrote' : '✅ Created'} ${outName}`);
  }
})();
