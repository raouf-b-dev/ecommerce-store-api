'use strict';

/**
 * Truthy values matching envalid bool(): true / t / yes / on / 1
 * (also accepts trimmed and case-folded forms for migrate-script DX).
 * @param {string | undefined | null} value
 * @returns {boolean}
 */
function isEnvTruthy(value) {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return (
    normalized === 'true' ||
    normalized === 't' ||
    normalized === 'yes' ||
    normalized === 'on' ||
    normalized === '1'
  );
}

/**
 * Falsy values matching envalid bool(): false / f / no / off / 0
 * (also accepts trimmed and case-folded forms for migrate-script DX).
 * @param {string | undefined | null} value
 * @returns {boolean}
 */
function isEnvFalsy(value) {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return (
    normalized === 'false' ||
    normalized === 'f' ||
    normalized === 'no' ||
    normalized === 'off' ||
    normalized === '0'
  );
}

module.exports = {
  isEnvTruthy,
  isEnvFalsy,
};
