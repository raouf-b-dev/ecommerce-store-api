#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const source = path.join(root, '.agents', 'skills');
const targets = [
  path.join(root, '.claude', 'skills'),
  path.join(root, '.github', 'skills'),
];
const checkOnly = process.argv.includes('--check');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listFilesRecursive(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  const out = [];
  const stack = [''];
  while (stack.length) {
    const rel = stack.pop();
    const abs = path.join(baseDir, rel);
    const entries = fs.readdirSync(abs, { withFileTypes: true });
    for (const entry of entries) {
      const entryRel = path.join(rel, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryRel);
      } else if (entry.isFile()) {
        out.push(entryRel.replace(/\\/g, '/'));
      }
    }
  }
  return out.sort();
}

function removeStale(targetDir, expectedFiles) {
  const targetFiles = listFilesRecursive(targetDir);
  const expectedSet = new Set(expectedFiles);
  for (const rel of targetFiles) {
    if (!expectedSet.has(rel)) {
      const abs = path.join(targetDir, rel);
      fs.rmSync(abs, { force: true });
    }
  }

  // Remove empty directories bottom-up.
  const walkDirs = [''];
  const allDirs = [];
  while (walkDirs.length) {
    const rel = walkDirs.pop();
    const abs = path.join(targetDir, rel);
    if (!fs.existsSync(abs)) continue;
    allDirs.push(rel);
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (entry.isDirectory()) walkDirs.push(path.join(rel, entry.name));
    }
  }
  allDirs
    .sort((a, b) => b.length - a.length)
    .forEach((rel) => {
      const abs = path.join(targetDir, rel);
      if (abs === targetDir) return;
      if (fs.existsSync(abs) && fs.readdirSync(abs).length === 0) {
        fs.rmdirSync(abs);
      }
    });
}

function syncTarget(targetDir, sourceFiles) {
  ensureDir(targetDir);

  for (const rel of sourceFiles) {
    const src = path.join(source, rel);
    const dst = path.join(targetDir, rel);
    ensureDir(path.dirname(dst));
    fs.copyFileSync(src, dst);
  }

  removeStale(targetDir, sourceFiles);
}

function checkTarget(targetDir, sourceFiles) {
  if (!fs.existsSync(targetDir)) {
    return [`Missing target directory: ${path.relative(root, targetDir)}`];
  }

  const errors = [];
  const targetFiles = listFilesRecursive(targetDir);
  const sourceSet = new Set(sourceFiles);
  const targetSet = new Set(targetFiles);

  for (const rel of sourceFiles) {
    if (!targetSet.has(rel)) {
      errors.push(`Missing file in ${path.relative(root, targetDir)}: ${rel}`);
      continue;
    }
    const src = fs.readFileSync(path.join(source, rel), 'utf8');
    const dst = fs.readFileSync(path.join(targetDir, rel), 'utf8');
    if (src !== dst) {
      errors.push(
        `Content mismatch in ${path.relative(root, targetDir)}: ${rel}`,
      );
    }
  }

  for (const rel of targetFiles) {
    if (!sourceSet.has(rel)) {
      errors.push(`Extra file in ${path.relative(root, targetDir)}: ${rel}`);
    }
  }

  return errors;
}

if (!fs.existsSync(source)) {
  console.error(
    'Source skills directory not found:',
    path.relative(root, source),
  );
  process.exit(1);
}

const sourceFiles = listFilesRecursive(source);

if (checkOnly) {
  const errors = [];
  for (const target of targets) {
    errors.push(...checkTarget(target, sourceFiles));
  }
  if (errors.length) {
    console.error('Skill mirror drift detected:');
    errors.forEach((e) => console.error(`- ${e}`));
    process.exit(1);
  }
  console.log('OK: skill mirrors are in sync.');
  process.exit(0);
}

for (const target of targets) {
  syncTarget(target, sourceFiles);
}

console.log(
  'Synced skills from .agents/skills to .claude/skills and .github/skills.',
);
