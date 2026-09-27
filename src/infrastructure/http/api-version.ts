/**
 * URI default API version. Single source of truth for Nest `defaultVersion`,
 * cookie Path, and E2E prefixes. v2 routes should set their own cookie path;
 * do not retarget v1 cookies to a newer version.
 */
export const DEFAULT_API_VERSION = '1';

export const DEFAULT_API_PREFIX = `/v${DEFAULT_API_VERSION}`;
