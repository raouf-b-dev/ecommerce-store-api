/**
 * Per-route auth throttle overrides (applied via `@Throttle` on auth routes).
 *
 * Nest applies every named profile registered in `ThrottlerModule.forRoot` to all
 * routes. Only `default` is registered globally; credential routes tighten that
 * profile here (~10/min is a common strict login window).
 */
export const THROTTLE_WINDOW_MS = 60_000;

/** Login, register, change-password — brute-force protection. */
export const AUTH_STRICT_LIMIT = 10;

/** Silent refresh — slightly higher than login (clients refresh more often). */
export const AUTH_REFRESH_LIMIT = 20;

export const AUTH_STRICT_THROTTLE = {
  default: { limit: AUTH_STRICT_LIMIT, ttl: THROTTLE_WINDOW_MS },
} as const;

export const AUTH_REFRESH_THROTTLE = {
  default: { limit: AUTH_REFRESH_LIMIT, ttl: THROTTLE_WINDOW_MS },
} as const;
