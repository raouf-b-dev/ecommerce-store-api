import { readFileSync } from 'fs';
import { join } from 'path';
import { getAppVersion } from './app-version';

describe('getAppVersion', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the version from package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version: string };

    expect(getAppVersion()).toBe(pkg.version);
  });

  it('falls back when package.json cannot be read', () => {
    jest.spyOn(process, 'cwd').mockReturnValue(join(__dirname, 'missing-dir'));
    const original = process.env.npm_package_version;
    delete process.env.npm_package_version;

    try {
      expect(getAppVersion()).toBe('unknown');
    } finally {
      if (original !== undefined) process.env.npm_package_version = original;
    }
  });
});
