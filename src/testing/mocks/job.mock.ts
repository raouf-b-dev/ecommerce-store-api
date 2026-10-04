import { Job, JobsOptions } from 'bullmq';
import { createMockQueue } from './queue.mock';

export interface MockJobOptions extends JobsOptions {
  id?: string;
}

export function createMockJob<T = void>(
  name: string,
  data: T,
  opts?: MockJobOptions,
  id?: string,
): Job<T> {
  const queue = Object.assign(createMockQueue(), {
    toKey: jest.fn(),
    keys: {},
  });
  const jobId = id ?? opts?.id;
  return new Job<T>(queue, name, data, opts, jobId);
}
