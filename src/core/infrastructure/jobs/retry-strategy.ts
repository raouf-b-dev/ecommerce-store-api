import { BackoffStrategy, RetryConfig } from './retry-config';

export class RetryStrategy {
  static calculateDelay(attemptsMade: number, config: RetryConfig): number {
    switch (config.backoffStrategy) {
      case BackoffStrategy.EXPONENTIAL:
        return this.exponentialBackoff(attemptsMade, config);
      case BackoffStrategy.LINEAR:
        return this.linearBackoff(attemptsMade, config);
      case BackoffStrategy.FIXED:
        return config.initialDelay;
      default:
        return config.initialDelay;
    }
  }

  private static exponentialBackoff(
    attemptsMade: number,
    config: RetryConfig,
  ): number {
    const multiplier = config.multiplier || 2;
    const delay = config.initialDelay * Math.pow(multiplier, attemptsMade);
    const maxDelay = config.maxDelay || Infinity;
    return Math.min(delay, maxDelay);
  }

  private static linearBackoff(
    attemptsMade: number,
    config: RetryConfig,
  ): number {
    const delay = config.initialDelay * (attemptsMade + 1);
    const maxDelay = config.maxDelay || Infinity;
    return Math.min(delay, maxDelay);
  }

  static toBullMQOptions(config: RetryConfig) {
    return {
      attempts: config.maxAttempts,
      backoff: {
        type: config.backoffStrategy,
        delay: config.initialDelay,
      },
    };
  }
}
