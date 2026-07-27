/**
 * Escapes a value for use inside a Redis Search TEXT field exact-match query.
 *
 * TEXT field queries use double-quoted syntax: @field:"value"
 * Inside double quotes, only two characters need escaping:
 *   - backslash (\) → \\
 *   - double quote (") → \"
 *
 * NOTE: If field types are changed from TEXT to TAG, a different escaping
 * strategy is required (TAG uses curly-brace syntax with separator-aware escaping).
 */
export function escapeRedisSearchTextValue(value: string): string {
  if (!value) return '';
  return value.replace(/[\\"]/g, '\\$&');
}
