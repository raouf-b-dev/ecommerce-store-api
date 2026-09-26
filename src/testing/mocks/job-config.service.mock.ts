// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { JobConfigService } from '../../infrastructure/jobs/job-config.service';

export class MockJobConfigService implements Partial<JobConfigService> {
  generateJobId = jest
    .fn()
    .mockImplementation((jobName) => `${jobName}-mock-id`);
  getJobId = jest.fn().mockImplementation((jobName, id) => `${jobName}-${id}`);
  getRetryPolicy = jest.fn().mockReturnValue({});
  getJobOptions = jest.fn().mockReturnValue({});
}
