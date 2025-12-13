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

  // Checkout Saga Jobs
  [JobNames.PROCESS_CHECKOUT]: {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 5000,
    multiplier: 2,
  },
  [JobNames.VALIDATE_CART]: {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 5000,
    multiplier: 2,
  },
  [JobNames.RESOLVE_ADDRESS]: {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 5000,
    multiplier: 2,
  },
  [JobNames.RESERVE_STOCK]: {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 5000,
    multiplier: 2,
  },
  [JobNames.CREATE_ORDER]: {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 5000,
    multiplier: 2,
  },
  [JobNames.PROCESS_PAYMENT]: {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 5000,
    multiplier: 2,
  },
  [JobNames.CONFIRM_RESERVATION]: {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 5000,
    multiplier: 2,
  },
  [JobNames.CLEAR_CART]: {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 5000,
    multiplier: 2,
  },
  [JobNames.RELEASE_STOCK]: {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 5000,
    multiplier: 2,
  },
  [JobNames.CANCEL_ORDER]: {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 5000,
    multiplier: 2,
  },
  [JobNames.REFUND_PAYMENT]: {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 5000,
    multiplier: 2,
  },
  [JobNames.FINALIZE_CHECKOUT]: {
    maxAttempts: 1,
    backoffStrategy: BackoffStrategy.FIXED,
    initialDelay: 0,
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
