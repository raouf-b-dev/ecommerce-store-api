'use strict';

/**
 * Fail-fast smoke runner: aborts on the first failed probe.
 */
async function runSuite(checks) {
  let passedCount = 0;

  for (const { name, fn } of checks) {
    const startTime = Date.now();
    try {
      await fn();
      const duration = Date.now() - startTime;
      console.log(`  ✅ [PASS] ${name} (${duration}ms)`);
      passedCount++;
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`  ❌ [FAIL] ${name} (${duration}ms) — ${err.message}`);
      console.log(`\n──────────────────────────────────────────────────`);
      console.log(
        `📊 Smoke Test Summary: ${passedCount} Passed, 1 Failed (fail-fast)`,
      );
      console.log(`──────────────────────────────────────────────────\n`);
      process.exit(1);
    }
  }

  console.log(`\n──────────────────────────────────────────────────`);
  console.log(`📊 Smoke Test Summary: ${passedCount} Passed, 0 Failed`);
  console.log(`──────────────────────────────────────────────────\n`);
  console.log(
    `✅ All smoke probes answered successfully (process-alive checks only).\n`,
  );
  process.exit(0);
}

module.exports = { runSuite };
