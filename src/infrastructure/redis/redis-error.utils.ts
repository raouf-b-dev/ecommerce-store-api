import { Logger } from '@nestjs/common';
import {
  toError,
  toErrorMessage,
} from '../../shared-kernel/infra/lang/error.utils';

const KNOWN_CONNECTION_ERRORS = [
  'ECONNABORTED',
  'ECONNRESET',
  'ECONNREFUSED',
  'Socket closed unexpectedly',
  'Connection is closed',
  'connect ETIMEDOUT',
  'no such index',
  'Unknown Index',
];

export function isKnownRedisConnectionError(err: unknown): boolean {
  if (!err) return false;

  if (err instanceof AggregateError && err.errors) {
    return err.errors.some((subErr) => isKnownRedisConnectionError(subErr));
  }

  const lowerMessage = toErrorMessage(err).toLowerCase();
  return KNOWN_CONNECTION_ERRORS.some((pattern) =>
    lowerMessage.includes(pattern.toLowerCase()),
  );
}

export function extractCleanErrorMessage(err: unknown): string {
  if (err instanceof AggregateError && err.errors?.length > 0) {
    return err.errors[0].message || 'AggregateError (Connection Refused)';
  }
  return toErrorMessage(err);
}

export function logRedisError(
  logger: Logger,
  source: string,
  err: unknown,
): void {
  const error = toError(err);

  if (isKnownRedisConnectionError(error)) {
    logger.warn(`${source}: ${extractCleanErrorMessage(error)}`);
  } else {
    logger.error(`${source}: ${error.message}`, error.stack);
  }
}
