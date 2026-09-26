// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { JobsOptions } from 'bullmq';

export class MockJob<T = any> {
  id = 'job-id';
  name = 'job-name';
  data: T;
  attemptsMade = 0;
  opts: Partial<JobsOptions> = { attempts: 3 };

  constructor(data: T, name = 'job-name', id = 'job-id') {
    this.data = data;
    this.name = name;
    this.id = id;
  }

  getChildrenValues = jest.fn();
  updateProgress = jest.fn();
  log = jest.fn();
  // Add more as needed
}
