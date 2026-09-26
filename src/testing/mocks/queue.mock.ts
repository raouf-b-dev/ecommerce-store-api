// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Queue } from 'bullmq';

export function createMockQueue(
  name: string = 'mock-queue',
): jest.Mocked<Queue> {
  return {
    name,
    add: jest.fn().mockResolvedValue({ id: `${name}-job-id` }),
    getJob: jest.fn().mockResolvedValue(null),
    close: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<Queue>;
}
