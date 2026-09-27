import { isRecord } from '../../shared-kernel/infra/lang/is-record';

export function firstChildValue(
  childrenValues: Record<string, unknown>,
): unknown {
  return Object.values(childrenValues)[0];
}

export function readNumberProperty(
  value: unknown,
  key: string,
): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const property = value[key];
  return typeof property === 'number' ? property : undefined;
}
