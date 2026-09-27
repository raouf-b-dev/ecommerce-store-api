/**
 * Demo product photos ship in `assets/demo-media/<version>/` and are served
 * by the API under DEMO_MEDIA_ROUTE. Bump DEMO_MEDIA_VERSION when a file
 * changes so long-lived browser and CDN caches pick up the new image. These
 * describe files committed to the repo, so they are code constants: only the
 * public host varies per deployment (PUBLIC_BASE_URL).
 */
export const DEMO_MEDIA_ROUTE = '/media/demo';
export const DEMO_MEDIA_VERSION = 'v1';

export function demoImageFileForSku(sku: string): string {
  return `${sku.toLowerCase()}.webp`;
}

export function buildDemoImageUrl(publicBaseUrl: string, sku: string): string {
  return new URL(
    `${DEMO_MEDIA_ROUTE}/${DEMO_MEDIA_VERSION}/${demoImageFileForSku(sku)}`,
    publicBaseUrl,
  ).href;
}

const DEMO_MEDIA_PATH = new RegExp(
  `^${DEMO_MEDIA_ROUTE}/v\\d+/[a-z0-9-]+\\.webp$`,
);

/**
 * True when the URL has the exact shape of a seeded demo photo
 * (`/media/demo/v<n>/<sku>.webp`) on any host, so a reseed can move demo
 * images to a new base URL or version without touching operator images.
 */
export function isDemoMediaUrl(url: string): boolean {
  try {
    return DEMO_MEDIA_PATH.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/**
 * Image a demo SKU should carry after a seed: the demo photo when the product
 * has none or points at an outdated demo URL, otherwise the operator's image.
 */
export function resolveDemoImageUrl(
  current: string | null,
  demoImageUrl: string,
): string {
  if (current == null || isDemoMediaUrl(current)) {
    return demoImageUrl;
  }
  return current;
}
