import { spawnSync } from 'node:child_process';

export const WIDE = 30;

const FAIL_LINE =
  /FAIL |^FAIL|AssertionError|error TS\d+|Error:|not ok|ELIFECYCLE|SyntaxError|TypeError|ReferenceError|Expected:|Received:/i;

export function failureExcerpt(text, max = 120) {
  const lines = String(text || '')
    .replaceAll('\r\n', '\n')
    .split('\n');
  const start = lines.findIndex((line) => FAIL_LINE.test(line));
  const slice = start >= 0 ? lines.slice(start) : lines.slice(-80);
  const body = slice.slice(0, max).join('\n').trim();
  const extra = slice.length > max ? `\n... ${slice.length - max} more lines` : '';
  return `${body}${extra}`.trim();
}

export function quoteArg(file) {
  return `"${String(file).replaceAll('"', '')}"`;
}

export function parseNameList(text) {
  return [
    ...new Set(
      String(text || '')
        .split(/\r?\n/)
        .map((file) => file.trim().replaceAll('\\', '/'))
        .filter(Boolean),
    ),
  ];
}

export function combineChanges(worktree, branch) {
  return [...new Set([...worktree, ...branch])];
}

export function runQuiet(command, cwd) {
  const result = spawnSync(command, {
    cwd,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 32 * 1024 * 1024,
    env: process.env,
    windowsHide: true,
  });
  if (result.error) return { ok: false, text: result.error.message };
  return { ok: result.status === 0, text: `${result.stdout || ''}${result.stderr || ''}` };
}

export function listRepoChanges(cwd, baseNames) {
  const worktree = combineChanges(
    parseNameList(gitText(['diff', '--name-only', '--relative'], cwd)),
    combineChanges(
      parseNameList(gitText(['diff', '--name-only', '--cached', '--relative'], cwd)),
      parseNameList(gitText(['ls-files', '--others', '--exclude-standard'], cwd)),
    ),
  );
  let base = 'none';
  for (const name of baseNames) {
    const verified = spawnSync('git', ['rev-parse', '--verify', '--quiet', name], {
      cwd,
      encoding: 'utf8',
    });
    if (verified.status !== 0) continue;
    const mergeBase = spawnSync('git', ['merge-base', 'HEAD', name], { cwd, encoding: 'utf8' });
    if (mergeBase.status !== 0) continue;
    base = name;
    break;
  }
  const branch =
    base === 'none'
      ? []
      : parseNameList(gitText(['diff', '--name-only', '--relative', `${base}...HEAD`], cwd));
  return { files: combineChanges(worktree, branch), base, worktree: worktree.length, branch: branch.length };
}

export function selectVitestCommands(allFiles, existing, kind) {
  const code = existing.filter(isUnitSource);
  const specs = existing.filter(isVitestSpec);
  const generated = existing.filter(isGenerated);
  const wide = code.length + specs.length > WIDE;
  const toolingOnly = allFiles.length > 0 && allFiles.every((file) => isDoc(file) || isTooling(file));
  const commands = [];

  if (!toolingOnly && !wide && (code.length > 0 || specs.length > 0)) {
    const lintTargets = [...code, ...specs];
    if (lintTargets.length > 0) {
      commands.push(['eslint', `npx eslint --max-warnings 0 ${lintTargets.map(quoteArg).join(' ')}`]);
    }
    if (kind === 'api') {
      const formatTargets = existing.filter(isFormatFile);
      if (formatTargets.length > 0) {
        commands.push(['format', `npx prettier --check ${formatTargets.map(quoteArg).join(' ')}`]);
      }
    }
    if (code.length > 0) {
      commands.push(['typecheck', 'npm run typecheck']);
      commands.push([
        'vitest related',
        `npx vitest related --run --reporter=minimal --passWithNoTests ${code.map(quoteArg).join(' ')}`,
      ]);
    } else {
      commands.push(['vitest', `npx vitest run --reporter=minimal ${specs.map(quoteArg).join(' ')}`]);
    }
  } else if (!wide && generated.length > 0 && code.length === 0 && specs.length === 0) {
    commands.push(['typecheck', 'npm run typecheck']);
  }

  if (kind === 'api' && !wide && allFiles.some(needsArch)) {
    commands.push(['test:arch', 'npm run test:arch -- --silent --forceExit']);
  }

  const scriptSpecs = existing.filter((file) => /^scripts\/.+\.spec\.js$/.test(file));
  if (kind === 'api' && !wide && scriptSpecs.length > 0 && scriptSpecs.length <= WIDE) {
    commands.push(['script tests', `node --test ${scriptSpecs.map(quoteArg).join(' ')}`]);
  }

  if (existing.length > 0) commands.push(['ascii-prose', 'node scripts/lint-ascii-prose.cjs']);

  return { commands, wide, code, specs, toolingOnly };
}

export function needsWebBuild(files) {
  return files.some(
    (file) =>
      file === 'next.config.ts' ||
      file.startsWith('src/app/') ||
      /\/(layout|page|template|default|metadata)\.(ts|tsx)$/.test(file),
  );
}

export function isDoc(file) {
  if (
    file === 'AGENTS.md' ||
    file === 'CLAUDE.md' ||
    file === 'README.md' ||
    file === 'CONTRIBUTING.md' ||
    file === 'CHANGELOG.md' ||
    file === 'SECURITY.md' ||
    file === 'LICENSE' ||
    file === 'AUTHORS' ||
    file === 'CODE_OF_CONDUCT.md' ||
    file === 'CITATION.cff'
  ) {
    return true;
  }
  if (file.startsWith('docs/') || file.startsWith('.agents/')) return true;
  if (file.endsWith('.md')) return true;
  if (file === '.cursorignore' || file === '.cursorindexingignore' || file === '.gitignore' || file === '.prettierignore') {
    return true;
  }
  return false;
}

export function isTooling(file) {
  if (file === 'package.json' || file === 'package-lock.json') return true;
  if (/^scripts\/agent-[\w.-]+\.mjs$/.test(file)) return true;
  if (/^(vitest|vite|eslint|prettier|tsconfig|playwright|nest-cli).*\.(mts|ts|js|mjs|cjs|json)$/.test(file)) {
    return true;
  }
  return false;
}

function isGenerated(file) {
  return file.includes('/api/generated/');
}

function isSpec(file) {
  return /\.(spec|test)\.(ts|tsx|js|mjs)$/.test(file);
}

function isVitestSpec(file) {
  return /^src\/.+\.(spec|test)\.(ts|tsx)$/.test(file);
}

function isUnitSource(file) {
  if (isSpec(file) || isDoc(file) || isTooling(file) || isGenerated(file)) return false;
  return /^src\/.+\.(ts|tsx)$/.test(file);
}

function isFormatFile(file) {
  return /^(src|test)\/.+\.(ts|tsx|js|json|md)$/.test(file);
}

function needsArch(file) {
  if (isDoc(file)) return false;
  return file.startsWith('test/architecture/') || /(^|\/)(core|domain|ports|adapters)\//.test(file);
}

function gitText(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return result.status === 0 ? result.stdout || '' : '';
}
