/**
 * Per-route auth throttle overrides.
 * Keep AUTH_STRICT_LIMIT aligned with `THROTTLE_STRICT_LIMIT` in env (default 10).
 *
 * Nest applies every named profile registered in `ThrottlerModule.forRoot` to all
 * routes. Only `default` is registered globally; sensitive auth routes tighten
 * that named profile via `@Throttle`.
 */
export const THROTTLE_WINDOW_MS = 60_000;

/** Login, register, change-password — brute-force protection. */
export const AUTH_STRICT_LIMIT = 10;

/** Refresh is used more often by clients (silent refresh); slightly higher. */
export const AUTH_REFRESH_LIMIT = 20;

export const AUTH_STRICT_THROTTLE = {
  default: { limit: AUTH_STRICT_LIMIT, ttl: THROTTLE_WINDOW_MS },
} as const;

export const AUTH_REFRESH_THROTTLE = {
  default: { limit: AUTH_REFRESH_LIMIT, ttl: THROTTLE_WINDOW_MS },
} as const;
