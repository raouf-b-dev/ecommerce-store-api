import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveDemoMedia } from './serve-demo-media';

describe('serveDemoMedia', () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), 'demo-media-'));
  });

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  it('mounts only the version folder under the versioned route with cross-origin headers', () => {
    mkdirSync(join(rootDir, 'v1'));
    const app = { useStaticAssets: jest.fn() };

    serveDemoMedia(app, { rootDir, route: '/media/demo', version: 'v1' });

    expect(app.useStaticAssets).toHaveBeenCalledWith(
      join(rootDir, 'v1'),
      expect.objectContaining({ prefix: '/media/demo/v1', immutable: true }),
    );
    const res = { setHeader: jest.fn() };
    app.useStaticAssets.mock.calls[0][1].setHeaders(res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cross-Origin-Resource-Policy',
      'cross-origin',
    );
  });

  it('throws when the version folder is missing', () => {
    const app = { useStaticAssets: jest.fn() };

    expect(() =>
      serveDemoMedia(app, { rootDir, route: '/media/demo', version: 'v1' }),
    ).toThrow(/Demo media folder not found/);
    expect(app.useStaticAssets).not.toHaveBeenCalled();
  });
});
