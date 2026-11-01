import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.join(__dirname, '../../src');
const EXCLUDED_FILES = new Set([
  'src/shared-kernel/helpers/lang/error.utils.ts',
  'src/shared-kernel/domain/exceptions/to-optional-error.ts',
]);

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*/')
  );
}

const BANNED_PATTERNS = [
  {
    name: 'new Error(String(...))',
    regex: /new Error\s*\(\s*String\s*\(/,
  },
  {
    name: 'instanceof Error ternary',
    regex: /instanceof Error\s*\?/,
  },
];

function collectSourceFiles(dir: string, results: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, results);
      continue;
    }

    if (!entry.name.endsWith('.ts')) continue;
    if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts')) {
      continue;
    }

    results.push(fullPath);
  }

  return results;
}

function matchesCoreOrSharedDomain(relativePath: string): boolean {
  return (
    /^src\/modules\/[^/]+\/core\//.test(relativePath) ||
    relativePath.startsWith('src/shared-kernel/domain/')
  );
}

function matchesModuleDomain(relativePath: string): boolean {
  return /^src\/modules\/[^/]+\/core\/domain\//.test(relativePath);
}

const ALLOWED_DOMAIN_ERROR_KINDS = new Set([
  'INVALID',
  'CONFLICT',
  'RULE_VIOLATION',
]);

describe('Error handling conventions', () => {
  it('should not use manual instanceof Error stringification patterns', () => {
    const violations: string[] = [];

    for (const filePath of collectSourceFiles(SRC_ROOT)) {
      const relativePath = path
        .relative(path.join(__dirname, '../..'), filePath)
        .split(path.sep)
        .join('/');

      if (EXCLUDED_FILES.has(relativePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (const pattern of BANNED_PATTERNS) {
        lines.forEach((line, index) => {
          if (isCommentLine(line)) return;
          if (pattern.regex.test(line)) {
            violations.push(
              `${relativePath}:${index + 1} - banned ${pattern.name}: ${line.trim()}`,
            );
          }
        });
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps HTTP status numbers and Nest HttpStatus out of core and shared domain', () => {
    const violations: string[] = [];

    for (const filePath of collectSourceFiles(SRC_ROOT)) {
      const relativePath = path
        .relative(path.join(__dirname, '../..'), filePath)
        .split(path.sep)
        .join('/');

      if (!matchesCoreOrSharedDomain(relativePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (isCommentLine(line)) return;
        if (
          /from\s+['"]@nestjs\/common['"]/.test(line) &&
          /\bHttpStatus\b/.test(line)
        ) {
          violations.push(
            `${relativePath}:${index + 1} - HttpStatus import: ${line.trim()}`,
          );
        }
        if (/\bHttpStatus\b/.test(line)) {
          violations.push(
            `${relativePath}:${index + 1} - HttpStatus use: ${line.trim()}`,
          );
        }
        if (/\bstatus:\s*\d+/.test(line)) {
          violations.push(
            `${relativePath}:${index + 1} - numeric status: ${line.trim()}`,
          );
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('restricts module domain ErrorKind usage to INVALID, CONFLICT, RULE_VIOLATION', () => {
    const violations: string[] = [];
    const kindUse = /ErrorKind\.([A-Z_]+)/g;

    for (const filePath of collectSourceFiles(SRC_ROOT)) {
      const relativePath = path
        .relative(path.join(__dirname, '../..'), filePath)
        .split(path.sep)
        .join('/');

      if (!matchesModuleDomain(relativePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      let match: RegExpExecArray | null;
      while ((match = kindUse.exec(content)) !== null) {
        const kind = match[1];
        if (!ALLOWED_DOMAIN_ERROR_KINDS.has(kind)) {
          violations.push(
            `${relativePath} - domain may not use ErrorKind.${kind}`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps shared-kernel/domain free of shared-kernel/infra imports', () => {
    const violations: string[] = [];
    const domainRoot = path.join(SRC_ROOT, 'shared-kernel', 'domain');

    for (const filePath of collectSourceFiles(domainRoot)) {
      const relativePath = path
        .relative(path.join(__dirname, '../..'), filePath)
        .split(path.sep)
        .join('/');
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (isCommentLine(line)) return;
        if (/shared-kernel\/infra/.test(line)) {
          violations.push(
            `${relativePath}:${index + 1} - infra import: ${line.trim()}`,
          );
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
