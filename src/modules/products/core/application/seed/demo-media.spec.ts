import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildDemoImageUrl,
  demoImageFileForSku,
  DEMO_MEDIA_VERSION,
  isDemoMediaUrl,
  resolveDemoImageUrl,
} from './demo-media';
import { DEMO_SEED_PRODUCTS } from './demo-products';
import { DEMO_MEDIA_DIR } from '../../../../../infrastructure/http/serve-demo-media';

describe('demo media', () => {
  it('builds absolute URLs and drops trailing slashes from the base', () => {
    expect(buildDemoImageUrl('https://api.example.com/', 'ELEC-ANC-001')).toBe(
      `https://api.example.com/media/demo/${DEMO_MEDIA_VERSION}/elec-anc-001.webp`,
    );
  });

  it('recognises demo media URLs on any host and rejects others', () => {
    expect(
      isDemoMediaUrl('http://localhost:3000/media/demo/v1/elec-anc-001.webp'),
    ).toBe(true);
    expect(
      isDemoMediaUrl('https://old.example/media/demo/v0/elec-anc-001.webp'),
    ).toBe(true);
    expect(isDemoMediaUrl('https://cdn.example.com/media/demos/a.webp')).toBe(
      false,
    );
    expect(isDemoMediaUrl('https://cdn.example.com/a.jpg')).toBe(false);
    expect(
      isDemoMediaUrl('https://cdn.example.com/media/demo/banners/hero.jpg'),
    ).toBe(false);
    expect(isDemoMediaUrl('/media/demo/v1/a.webp')).toBe(false);
  });

  it('replaces missing or demo images and keeps operator images', () => {
    const demo = 'http://localhost:3000/media/demo/v1/elec-anc-001.webp';

    expect(resolveDemoImageUrl(null, demo)).toBe(demo);
    expect(
      resolveDemoImageUrl('https://old.example/media/demo/v0/a.webp', demo),
    ).toBe(demo);
    expect(
      resolveDemoImageUrl('https://cdn.example.com/products/a.jpg', demo),
    ).toBe('https://cdn.example.com/products/a.jpg');
  });

  it('ships a photo for every demo SKU', () => {
    const missing = DEMO_SEED_PRODUCTS.map((seed) =>
      demoImageFileForSku(seed.sku),
    ).filter(
      (file) => !existsSync(join(DEMO_MEDIA_DIR, DEMO_MEDIA_VERSION, file)),
    );
    expect(missing).toEqual([]);
  });
});
