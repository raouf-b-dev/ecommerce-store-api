#!/usr/bin/env node
'use strict';

// Post-deployment smoke test suite for E-Commerce Store API.
//
// Process-alive HTTP probes only (not e2e). See scripts/smoke/.
//
// Usage:
//   node scripts/smoke-test.js
//   node scripts/smoke-test.js --base-url=http://localhost:3000

const { loadEnv, parseArgs } = require('./lib/cli');
const { buildProbes } = require('./smoke/probes');
const { runSuite } = require('./smoke/runner');

loadEnv();
const args = parseArgs();

const port = process.env.PORT || '3000';
const baseUrl = (
  args['base-url'] ||
  process.env.SMOKE_TEST_BASE_URL ||
  `http://localhost:${port}`
).replace(/\/$/, '');

const metricsApiKey = process.env.METRICS_API_KEY;
const timeoutMs = parseInt(args.timeout || '10000', 10);

console.log(`\n🔥 Starting E-Commerce Store API Post-Deployment Smoke Tests`);
console.log(`   Target Base URL: ${baseUrl}\n`);

const probes = buildProbes({ baseUrl, timeoutMs, metricsApiKey });

runSuite(probes).catch((err) => {
  console.error(`💥 Unexpected error during smoke test execution:`, err);
  process.exit(1);
});
