// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { ApplicationLifecyclePort } from '../../shared-kernel/domain/interfaces/application-lifecycle.port';

export class MockApplicationLifecycle implements ApplicationLifecyclePort {
  isShuttingDown = false;
}
