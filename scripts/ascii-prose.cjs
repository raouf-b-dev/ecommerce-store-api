'use strict';

const fs = require('node:fs');
const path = require('node:path');

/** Smart punctuation that reads as generated prose. */
const MARKS = [
  { ch: '\u2014', name: 'em dash (U+2014)', ascii: '-' },
  { ch: '\u2013', name: 'en dash (U+2013)', ascii: '-' },
  { ch: '\u2011', name: 'non-breaking hyphen (U+2011)', ascii: '-' },
  { ch: '\u2018', name: 'left single quote (U+2018)', ascii: "'" },
  { ch: '\u2019', name: 'right single quote (U+2019)', ascii: "'" },
  { ch: '\u201C', name: 'left double quote (U+201C)', ascii: '"' },
  { ch: '\u201D', name: 'right double quote (U+201D)', ascii: '"' },
  { ch: '\u2026', name: 'ellipsis (U+2026)', ascii: '...' },
  { ch: '\u00A0', name: 'non-breaking space (U+00A0)', ascii: ' ' },
];

const MARK_BY_CHAR = new Map(MARKS.map((mark) => [mark.ch, mark]));

const FORBIDDEN_RE = /[\u2011\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u00A0]/g;

const IGNORE_DIR_NAMES = new Set([
  '.git',
  '.next',
  'node_modules',
  'dist',
  'coverage',
  'out',
  'playwright-report',
  'test-results',
  'generated',
]);

function shouldIgnoreDir(dirName) {
  return IGNORE_DIR_NAMES.has(dirName);
}

function isAdrPath(filePath) {
  return filePath.replace(/\\/g, '/').includes('/docs/architecture/adr/');
}

function isGeneratedPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return (
    normalized.includes('/src/lib/api/generated/') ||
    normalized.endsWith('/next-env.d.ts')
  );
}

function collectFiles(rootDir) {
  const files = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.agents') {
        if (entry.isDirectory() && entry.name !== '.agents') {
          continue;
        }
        if (!entry.isDirectory()) {
          continue;
        }
      }

      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (shouldIgnoreDir(entry.name)) {
          continue;
        }
        walk(full);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }
      if (isAdrPath(full) || isGeneratedPath(full)) {
        continue;
      }

      const ext = path.extname(entry.name);
      if (ext === '.md' || ext === '.mdc') {
        files.push({ full, kind: 'prose' });
        continue;
      }
      if (
        ext === '.ts' ||
        ext === '.tsx' ||
        ext === '.js' ||
        ext === '.mjs' ||
        ext === '.cjs'
      ) {
        if (entry.name === 'ascii-prose.cjs' || entry.name === 'lint-ascii-prose.cjs') {
          continue;
        }
        files.push({ full, kind: 'code' });
      }
    }
  }

  walk(rootDir);
  return files;
}

function findingsInText(text, filePath, lineOffset = 1) {
  const findings = [];
  const lines = text.split(/\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    FORBIDDEN_RE.lastIndex = 0;
    let match = FORBIDDEN_RE.exec(line);
    while (match) {
      const ch = match[0];
      const mark = MARK_BY_CHAR.get(ch);
      findings.push({
        filePath,
        line: i + lineOffset,
        column: match.index + 1,
        char: ch,
        name: mark ? mark.name : `U+${ch.codePointAt(0).toString(16).toUpperCase()}`,
      });
      match = FORBIDDEN_RE.exec(line);
    }
  }
  return findings;
}

function replaceMarks(text) {
  let next = text;
  for (const mark of MARKS) {
    next = next.split(mark.ch).join(mark.ascii);
  }
  return next;
}

function findComments(text) {
  const comments = [];
  let i = 0;
  const n = text.length;

  function skipString(quote) {
    i += 1;
    while (i < n) {
      const c = text[i];
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (quote === '`' && c === '$' && text[i + 1] === '{') {
        i += 2;
        let depth = 1;
        while (i < n && depth > 0) {
          if (text[i] === '{') {
            depth += 1;
          } else if (text[i] === '}') {
            depth -= 1;
          } else if (text[i] === '"' || text[i] === "'" || text[i] === '`') {
            const inner = text[i];
            skipString(inner);
            continue;
          } else if (text[i] === '/' && text[i + 1] === '/') {
            while (i < n && text[i] !== '\n') {
              i += 1;
            }
            continue;
          } else if (text[i] === '/' && text[i + 1] === '*') {
            i += 2;
            while (i < n - 1 && !(text[i] === '*' && text[i + 1] === '/')) {
              i += 1;
            }
            i += 2;
            continue;
          }
          i += 1;
        }
        continue;
      }
      if (c === quote) {
        i += 1;
        return;
      }
      i += 1;
    }
  }

  while (i < n) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"' || c === "'" || c === '`') {
      skipString(c);
      continue;
    }
    if (c === '/' && next === '/') {
      const start = i + 2;
      i += 2;
      while (i < n && text[i] !== '\n') {
        i += 1;
      }
      comments.push({ start, end: i });
      continue;
    }
    if (c === '/' && next === '*') {
      const start = i + 2;
      i += 2;
      while (i < n - 1 && !(text[i] === '*' && text[i + 1] === '/')) {
        i += 1;
      }
      comments.push({ start, end: i });
      i += 2;
      continue;
    }
    i += 1;
  }

  return comments;
}

function lineColAt(text, index) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

function scanFile(filePath, kind) {
  const text = fs.readFileSync(filePath, 'utf8');
  const findings = [];

  if (kind === 'prose') {
    return { text, findings: findingsInText(text, filePath), comments: [] };
  }

  const comments = findComments(text);
  for (const comment of comments) {
    const chunk = text.slice(comment.start, comment.end);
    const { line } = lineColAt(text, comment.start);
    const local = findingsInText(chunk, filePath, line);
    findings.push(...local);
  }

  return { text, findings, comments };
}

function applyFix(text, kind) {
  if (kind === 'prose') {
    return replaceMarks(text);
  }

  const comments = findComments(text);
  if (comments.length === 0) {
    return text;
  }

  let next = text;
  for (let i = comments.length - 1; i >= 0; i -= 1) {
    const comment = comments[i];
    const original = next.slice(comment.start, comment.end);
    const replaced = replaceMarks(original);
    if (replaced !== original) {
      next = next.slice(0, comment.start) + replaced + next.slice(comment.end);
    }
  }
  return next;
}

function lintRepo(rootDir, { fix = false } = {}) {
  const files = collectFiles(rootDir);
  const allFindings = [];
  let changed = 0;

  for (const file of files) {
    const { text, findings } = scanFile(file.full, file.kind);
    if (fix) {
      const next = applyFix(text, file.kind);
      if (next !== text) {
        fs.writeFileSync(file.full, next, 'utf8');
        changed += 1;
      }
      continue;
    }
    allFindings.push(...findings);
  }

  return { findings: allFindings, changed, scanned: files.length };
}

function formatFinding(finding, rootDir) {
  const rel = path.relative(rootDir, finding.filePath).replace(/\\/g, '/');
  return `${rel}:${finding.line}:${finding.column} ${finding.name}`;
}

function createEslintPlugin() {
  return {
    rules: {
      'no-smart-punctuation': {
        meta: {
          type: 'problem',
          docs: {
            description:
              'Disallow smart punctuation in comments. Use ASCII. See docs/ai/CONVENTIONS.md.',
          },
        },
        create(context) {
          const sourceCode = context.sourceCode ?? context.getSourceCode();
          return {
            Program() {
              for (const comment of sourceCode.getAllComments()) {
                const value = comment.value;
                FORBIDDEN_RE.lastIndex = 0;
                let match = FORBIDDEN_RE.exec(value);
                while (match) {
                  const ch = match[0];
                  const mark = MARK_BY_CHAR.get(ch);
                  const prefix = comment.type === 'Block' ? 2 : 2;
                  const start = comment.range[0] + prefix + match.index;
                  context.report({
                    loc: {
                      start: sourceCode.getLocFromIndex(start),
                      end: sourceCode.getLocFromIndex(start + ch.length),
                    },
                    message: `Comment uses ${mark ? mark.name : 'smart punctuation'}; use ASCII '${mark ? mark.ascii : '-'}'.`,
                  });
                  match = FORBIDDEN_RE.exec(value);
                }
              }
            },
          };
        },
      },
    },
  };
}

module.exports = {
  MARKS,
  FORBIDDEN_RE,
  collectFiles,
  lintRepo,
  formatFinding,
  createEslintPlugin,
  replaceMarks,
};
