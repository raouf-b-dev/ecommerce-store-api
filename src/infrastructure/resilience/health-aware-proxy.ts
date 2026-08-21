/**
 * Creates a health-aware proxy that routes method calls to the primary
 * implementation when it is healthy, or to the fallback when it is not.
 *
 * Used at the module DI level to transparently switch between Redis
 * (cache-aside) and PostgreSQL (source of truth) repositories based
 * on the real-time health state of the Redis connection.
 */
export function createHealthAwareProxy<T extends object>(
  primary: T,
  fallback: T,
  isHealthy: () => boolean,
): T {
  return new Proxy({} as T, {
    get(_, prop) {
      const target = isHealthy() ? primary : fallback;
      const value = target[prop as keyof T];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
