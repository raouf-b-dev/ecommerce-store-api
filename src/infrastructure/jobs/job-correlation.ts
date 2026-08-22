export function readJobCorrelationId(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  if (!('correlationId' in data)) {
    return undefined;
  }

  const { correlationId } = data;
  return typeof correlationId === 'string' ? correlationId : undefined;
}
