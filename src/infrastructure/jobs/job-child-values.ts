export function firstChildValue(
  childrenValues: Record<string, unknown>,
): unknown {
  return Object.values(childrenValues)[0];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
