import { BackoffStrategy, RetryConfig } from './retry-config';
import { JobName, JobNames } from './job-names';

export const JOB_RETRY_POLICIES: Record<JobName, RetryConfig> = {
  [JobNames.SEND_NOTIFICATION]: {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 5000,
    multiplier: 2,
  },

  [JobNames.SAVE_NOTIFICATION_HISTORY]: {
    maxAttempts: 2,
    backoffStrategy: BackoffStrategy.FIXED,
    initialDelay: 1000,
  },
};

export function getRetryPolicy(jobName: JobName): RetryConfig {
  return (
    JOB_RETRY_POLICIES[jobName] || {
      maxAttempts: 3,
      backoffStrategy: BackoffStrategy.EXPONENTIAL,
      initialDelay: 1000,
      maxDelay: 60000,
      multiplier: 2,
    }
  );
}
