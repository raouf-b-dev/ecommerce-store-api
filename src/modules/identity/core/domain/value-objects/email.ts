/**
 * Canonical email form for identity storage and lookup.
 * Register and update already store this; lookups must match it.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
