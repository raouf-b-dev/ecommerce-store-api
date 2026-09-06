import { FlowProducerService } from '../../infrastructure/queue/flow-producer.service';

export class MockFlowProducerService implements Partial<FlowProducerService> {
  add = jest.fn().mockResolvedValue({ job: { id: 'mock-flow-job-id' } });
  addBulk = jest.fn().mockResolvedValue([]);
  onApplicationShutdown = jest.fn().mockResolvedValue(undefined);
}
