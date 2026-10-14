import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { combineChanges, failureExcerpt, selectVitestCommands } from './agent-output.mjs';

describe('failureExcerpt', () => {
  it('keeps the failure and drops the passing prefix', () => {
    const text = ['PASS src/ok.spec.ts', 'PASS src/also.spec.ts', 'FAIL src/foo.spec.ts', 'AssertionError: nope', 'Expected: 1', 'Received: 2'].join('\n');
    const excerpt = failureExcerpt(text);
    assert.match(excerpt, /^FAIL src\/foo\.spec\.ts/);
    assert.equal(excerpt.includes('PASS src/ok'), false);
    assert.match(excerpt, /Expected: 1/);
  });

  it('caps a long failure', () => {
    const lines = ['FAIL src/foo.spec.ts', ...Array.from({ length: 200 }, (_, i) => `detail ${i}`)];
    const excerpt = failureExcerpt(lines.join('\n'), 5);
    assert.match(excerpt, /more lines/);
    assert.equal(excerpt.split('\n').length, 6);
  });
});

describe('combineChanges', () => {
  it('unions the worktree with commits on the branch', () => {
    assert.deepEqual(combineChanges(['src/new.ts'], ['src/committed.ts', 'src/new.ts']), ['src/new.ts', 'src/committed.ts']);
  });
});

describe('selectVitestCommands api', () => {
  it('runs prose only for a docs diff', () => {
    const plan = selectVitestCommands(['docs/ai/CONVENTIONS.md'], ['docs/ai/CONVENTIONS.md'], 'api');
    assert.deepEqual(
      plan.commands.map(([label]) => label),
      ['ascii-prose'],
    );
    assert.equal(plan.wide, false);
  });

  it('runs eslint, format, typecheck, and related tests for one source file', () => {
    const plan = selectVitestCommands(['src/modules/orders/foo.ts'], ['src/modules/orders/foo.ts'], 'api');
    assert.deepEqual(
      plan.commands.map(([label]) => label),
      ['eslint', 'format', 'typecheck', 'vitest related', 'ascii-prose'],
    );
  });

  it('runs the architecture suite when a domain file changes', () => {
    const file = 'src/modules/orders/core/domain/order.ts';
    const plan = selectVitestCommands([file], [file], 'api');
    assert.ok(plan.commands.some(([label]) => label === 'test:arch'));
  });

  it('typechecks a generated client without related tests', () => {
    const file = 'src/lib/api/generated/schema.d.ts';
    const plan = selectVitestCommands([file], [file], 'api');
    assert.deepEqual(
      plan.commands.map(([label]) => label),
      ['typecheck', 'ascii-prose'],
    );
  });

  it('skips the suite on a wide diff', () => {
    const files = Array.from({ length: 31 }, (_, i) => `src/mod/file-${i}.ts`);
    const plan = selectVitestCommands(files, files, 'api');
    assert.equal(plan.wide, true);
    assert.equal(
      plan.commands.some(([label]) => label === 'vitest related'),
      false,
    );
    assert.deepEqual(
      plan.commands.map(([label]) => label),
      ['ascii-prose'],
    );
  });
});
