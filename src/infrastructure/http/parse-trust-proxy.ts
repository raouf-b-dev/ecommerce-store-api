export type TrustProxySetting = boolean | number | string;

export function parseTrustProxy(value: string): TrustProxySetting {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  const hops = Number(trimmed);
  if (!Number.isNaN(hops)) return hops;

  return trimmed;
}
