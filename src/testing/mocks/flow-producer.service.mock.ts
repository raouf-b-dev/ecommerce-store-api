// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { FlowProducerService } from '../../infrastructure/queue/flow-producer.service';

export class MockFlowProducerService implements Partial<FlowProducerService> {
  add = jest.fn().mockResolvedValue({ job: { id: 'mock-flow-job-id' } });
  addBulk = jest.fn().mockResolvedValue([]);
  onApplicationShutdown = jest.fn().mockResolvedValue(undefined);
}
