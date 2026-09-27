export enum BackoffStrategy {
  EXPONENTIAL = 'exponential',
  LINEAR = 'linear',
  FIXED = 'fixed',
}

export interface RetryConfig {
  maxAttempts: number;
  backoffStrategy: BackoffStrategy;
  initialDelay: number; // milliseconds
  maxDelay?: number; // cap for exponential backoff
  multiplier?: number; // for exponential (default 2)
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoffStrategy: BackoffStrategy.EXPONENTIAL,
  initialDelay: 1000,
  maxDelay: 60000, // 1 minute max
  multiplier: 2,
};
