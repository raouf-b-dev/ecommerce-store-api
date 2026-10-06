import { EnvError, makeValidator } from 'envalid';
import { type StringValue } from 'ms';
import { parseDuration } from '../../shared-kernel/infra/lang/duration';

/** Envalid wrapper around {@link parseDuration}. */
export function parseEnvDuration(value: string): StringValue {
  const parsed = parseDuration(value);
  if (parsed === undefined) {
    throw new EnvError('must be a duration such as 15m or 7d');
  }
  return parsed;
}

export const duration = makeValidator<StringValue>(parseEnvDuration);
