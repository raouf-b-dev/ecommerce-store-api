'use strict';

/**
 * Truthy values matching envalid bool(): true / 1 (case-insensitive, trimmed).
 * @param {string | undefined | null} value
 * @returns {boolean}
 */
function isEnvTruthy(value) {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}

/**
 * Falsy values matching envalid bool(): false / 0 (case-insensitive, trimmed).
 * @param {string | undefined | null} value
 * @returns {boolean}
 */
function isEnvFalsy(value) {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'false' || normalized === '0';
}

module.exports = {
  isEnvTruthy,
  isEnvFalsy,
};
