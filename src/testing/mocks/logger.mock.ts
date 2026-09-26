// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { LoggerService, Logger } from '@nestjs/common';

export class MockLogger extends Logger implements LoggerService {
  constructor() {
    super();
  }

  log = jest.fn() as any;
  error = jest.fn() as any;
  warn = jest.fn() as any;
  debug = jest.fn() as any;
  verbose = jest.fn() as any;
  fatal = jest.fn() as any;
  setLogLevels = jest.fn() as any;
}
