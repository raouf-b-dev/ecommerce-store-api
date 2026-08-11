#!/usr/bin/env node
// Post-deployment smoke test suite for E-Commerce Store API.
//
// Probes:
//   1. GET /health/liveness
//   2. GET /health/readiness
//   3. GET /health
//   4. GET /metrics (with API key)
//   5. POST /v1/authentication/register + POST /v1/authentication/login
//   6. GET /v1/users/:id (authenticated, own profile)
//
// Usage:
//   node scripts/smoke-test.js
//   node scripts/smoke-test.js --base-url=http://localhost:3000

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const nodeEnv = process.env.NODE_ENV || 'development';
const envFiles = [`.env.${nodeEnv}`, '.env.production', '.env'];
for (const file of envFiles) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
    break;
  }
}

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.startsWith('--') ? arg.slice(2).split('=') : [arg, true];
  acc[k] = v === undefined ? true : v;
  return acc;
}, {});

const port = process.env.PORT || '3000';
const baseUrl = (
  args['base-url'] ||
  process.env.SMOKE_TEST_BASE_URL ||
  `http://localhost:${port}`
).replace(/\/$/, '');

const metricsApiKey = process.env.METRICS_API_KEY;
const TIMEOUT_MS = parseInt(args.timeout || '10000', 10);

console.log(`\n🔥 Starting E-Commerce Store API Post-Deployment Smoke Tests`);
console.log(`   Target Base URL: ${baseUrl}\n`);

let passedCount = 0;
let failedCount = 0;
let accessToken = null;
let registeredUserId = null;

const smokeEmail = `smoke-${Date.now()}@example.com`;
const smokePassword = 'SmokeTest123!';

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function runCheck(name, fn) {
  const startTime = Date.now();
  try {
    await fn();
    const duration = Date.now() - startTime;
    console.log(`  ✅ [PASS] ${name} (${duration}ms)`);
    passedCount++;
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`  ❌ [FAIL] ${name} (${duration}ms) — ${err.message}`);
    failedCount++;
  }
}

async function executeSuite() {
  await runCheck('Liveness Probe (/health/liveness)', async () => {
    const res = await fetchWithTimeout(`${baseUrl}/health/liveness`);
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${res.status}`);
    }
  });

  await runCheck('Readiness Probe (/health/readiness)', async () => {
    const res = await fetchWithTimeout(`${baseUrl}/health/readiness`);
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${res.status}`);
    }
  });

  await runCheck('Full Health Check (/health)', async () => {
    const res = await fetchWithTimeout(`${baseUrl}/health`);
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${res.status}`);
    }
  });

  await runCheck('Prometheus Metrics Endpoint (/metrics)', async () => {
    if (!metricsApiKey) {
      throw new Error('METRICS_API_KEY is not set');
    }
    const res = await fetchWithTimeout(`${baseUrl}/metrics`, {
      headers: { 'x-metrics-api-key': metricsApiKey },
    });
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${res.status}`);
    }
    const text = await res.text();
    if (
      !text.includes('process_cpu_user_seconds_total') &&
      !text.includes('http_requests_total')
    ) {
      throw new Error('Response did not contain expected Prometheus metrics');
    }
  });

  await runCheck('Auth Register + Login (/v1/authentication/*)', async () => {
    const registerRes = await fetchWithTimeout(
      `${baseUrl}/v1/authentication/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: smokeEmail,
          password: smokePassword,
          firstName: 'Smoke',
          lastName: 'Test',
        }),
      },
    );

    if (registerRes.status !== 201) {
      throw new Error(`Register failed with HTTP status ${registerRes.status}`);
    }

    const registerData = await registerRes.json();
    registeredUserId = registerData.id;
    if (!registeredUserId) {
      throw new Error('Register response did not contain user id');
    }

    const loginRes = await fetchWithTimeout(
      `${baseUrl}/v1/authentication/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: smokeEmail,
          password: smokePassword,
        }),
      },
    );

    if (loginRes.status !== 200) {
      throw new Error(`Login failed with HTTP status ${loginRes.status}`);
    }

    const data = await loginRes.json();
    const token = data.accessToken;
    if (!token) {
      throw new Error('Login response did not contain accessToken');
    }
    accessToken = token;
  });

  await runCheck('Authenticated API Probe (GET /v1/users/:id)', async () => {
    if (!accessToken) {
      throw new Error(
        'Cannot run authenticated probe because login did not produce an access token',
      );
    }
    if (!registeredUserId) {
      throw new Error(
        'Skipping authenticated probe — registered user id missing',
      );
    }

    const res = await fetchWithTimeout(
      `${baseUrl}/v1/users/${registeredUserId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${res.status}`);
    }
  });

  console.log(`\n──────────────────────────────────────────────────`);
  console.log(
    `📊 Smoke Test Summary: ${passedCount} Passed, ${failedCount} Failed`,
  );
  console.log(`──────────────────────────────────────────────────\n`);

  if (failedCount > 0) {
    process.exit(1);
  }

  console.log(
    `🚀 All smoke tests passed successfully! Production deployment verified.\n`,
  );
  process.exit(0);
}

executeSuite().catch((err) => {
  console.error(`💥 Unexpected error during smoke test execution:`, err);
  process.exit(1);
});
