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
