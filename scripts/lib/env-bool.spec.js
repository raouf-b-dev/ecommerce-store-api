'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isEnvTruthy, isEnvFalsy } = require('./env-bool');

describe('isEnvTruthy', () => {
  it('accepts true and 1 with trimming and case folding', () => {
    assert.equal(isEnvTruthy('true'), true);
    assert.equal(isEnvTruthy('TRUE'), true);
    assert.equal(isEnvTruthy(' 1 '), true);
    assert.equal(isEnvTruthy('1'), true);
  });

  it('rejects false, 0, empty, and missing', () => {
    assert.equal(isEnvTruthy('false'), false);
    assert.equal(isEnvTruthy('0'), false);
    assert.equal(isEnvTruthy(''), false);
    assert.equal(isEnvTruthy(undefined), false);
    assert.equal(isEnvTruthy(null), false);
  });
});

describe('isEnvFalsy', () => {
  it('accepts false and 0 with trimming and case folding', () => {
    assert.equal(isEnvFalsy('false'), true);
    assert.equal(isEnvFalsy('FALSE'), true);
    assert.equal(isEnvFalsy(' 0 '), true);
  });

  it('rejects true, 1, empty, and missing', () => {
    assert.equal(isEnvFalsy('true'), false);
    assert.equal(isEnvFalsy('1'), false);
    assert.equal(isEnvFalsy(''), false);
    assert.equal(isEnvFalsy(undefined), false);
  });
});
