// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Escapes a value for use inside a Redis Search TEXT field exact-match query.
 *
 * TEXT field queries use double-quoted syntax: @field:"value"
 * Prefer {@link textEquals} at call sites so field type and query syntax stay paired.
 */
export function escapeRedisSearchTextValue(value: string): string {
  if (!value) return '';
  return value.replace(/[\\"]/g, '\\$&');
}

/**
 * Escapes a value for use inside a Redis Search TAG query: @field:{value}
 *
 * TAG values require escaping punctuation (including `-`, `@`, `.`).
 * Prefer {@link tagEquals} at call sites so field type and query syntax stay paired.
 */
export function escapeRedisSearchTagValue(value: string): string {
  if (!value) return '';
  return value.replace(/([,.<>{}[\]"':;!@#$%^&*()\-+=~|\\/\s])/g, '\\$1');
}

/** Builds `@field:"value"` with TEXT escaping. */
export function textEquals(field: string, value: string): string {
  return `@${field}:"${escapeRedisSearchTextValue(value)}"`;
}

/** Builds `@field:{value}` with TAG escaping. */
export function tagEquals(field: string, value: string): string {
  return `@${field}:{${escapeRedisSearchTagValue(value)}}`;
}
