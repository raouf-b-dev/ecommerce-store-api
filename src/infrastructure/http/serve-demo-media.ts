import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';

/** Committed demo photos, one folder per media version. The Docker image runs from /app. */
export const DEMO_MEDIA_DIR = join(process.cwd(), 'assets', 'demo-media');

export interface DemoMediaOptions {
  /** Directory holding one folder per media version. */
  rootDir: string;
  /** URL prefix the versioned folders are served under. */
  route: string;
  /** Version folder the seed writes URLs for; must exist under rootDir. */
  version: string;
}

/**
 * Serves the current version of the demo product photos as immutable,
 * cross-origin static files. Throws at boot when the version folder is
 * missing so a packaging mistake surfaces as a failed start instead of broken
 * images.
 */
export function serveDemoMedia(
  app: Pick<NestExpressApplication, 'useStaticAssets'>,
  { rootDir, route, version }: DemoMediaOptions,
): void {
  const versionDir = join(rootDir, version);
  // Paths come from boot-time constants, never from request input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!existsSync(versionDir)) {
    throw new Error(
      `Demo media folder not found at ${versionDir}. Copy assets/demo-media into the image or run from the repository root.`,
    );
  }
  // Must run after helmet: this CORP header replaces helmet's same-origin
  // default because the storefront and admin load these from other origins.
  app.useStaticAssets(versionDir, {
    prefix: `${route}/${version}`,
    maxAge: '365d',
    immutable: true,
    index: false,
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });
}
