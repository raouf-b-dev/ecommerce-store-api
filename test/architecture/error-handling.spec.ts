import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.join(__dirname, '../../src');
const EXCLUDED_FILES = new Set(['src/shared-kernel/infra/lang/error.utils.ts']);

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
});
