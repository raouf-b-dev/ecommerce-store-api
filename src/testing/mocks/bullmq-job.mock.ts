import { JobsOptions } from 'bullmq';

export class MockJob<T = any, R = any> {
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
