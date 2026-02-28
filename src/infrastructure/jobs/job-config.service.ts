import { Injectable } from '@nestjs/common';
import { JobsOptions } from 'bullmq';
import { JobName } from './job-names';
import { getRetryPolicy } from './job-retry-policies';
import { RetryStrategy } from './retry-strategy';
import { RetryConfig } from './retry-config';

import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JobConfigService {
  generateJobId(jobName: JobName): string {
    return `${jobName}-${uuidv4()}`;
  }

  getJobId(jobName: JobName, identifier: string | number): string {
    return `${jobName}-${identifier}`;
  }

  getRetryPolicy(jobName: JobName): RetryConfig {
    return getRetryPolicy(jobName);
  }

  getJobOptions(
    jobName: JobName,
    identifier?: string | number,
  ): Partial<JobsOptions> {
    const retryPolicy = this.getRetryPolicy(jobName);
    const options: Partial<JobsOptions> = {
      ...RetryStrategy.toBullMQOptions(retryPolicy),
      removeOnComplete: true,
    };

    if (identifier !== undefined) {
      options.jobId = this.getJobId(jobName, identifier);
    }

    return options;
  }
}
