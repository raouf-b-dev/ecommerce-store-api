#!/usr/bin/env node
// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

'use strict';

const { resolve } = require('path');
const {
  COMPOSE_UP_DEV_ARGS,
  checkDockerReady,
  createDockerRunner,
} = require('./lib/docker');
const { printFailure } = require('./lib/cli');

const repoRoot = resolve(__dirname, '..');
const runDocker = createDockerRunner(repoRoot);

const ready = checkDockerReady(runDocker);
if (!ready.ok) {
  printFailure(ready, { label: 'docker' });
  process.exit(1);
}

const result = runDocker(COMPOSE_UP_DEV_ARGS, {
  stdio: 'inherit',
  timeout: null,
});
process.exit(result.status == null ? 1 : result.status);
