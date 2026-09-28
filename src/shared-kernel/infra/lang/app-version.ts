import { readFileSync } from 'fs';
import { join } from 'path';
import { isRecord } from './is-record';

/**
 * Reads the version from package.json in the process working directory
 * (the repo root locally, /app in the Docker image), so it works whether or
 * not the process was started through npm.
 */
export function getAppVersion(): string {
  try {
    const pkg: unknown = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    );
    if (isRecord(pkg) && typeof pkg.version === 'string') return pkg.version;
  } catch {
    // Fall back to the npm-provided value below.
  }
  return process.env.npm_package_version || 'unknown';
}
