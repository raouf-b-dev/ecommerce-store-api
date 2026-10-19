# Demo product photos

The images in this folder are AI-generated product photos created for this project's demo catalog. They do not depict real branded products and contain no third-party trademarks or photography.

They may be copied, modified, and redistributed with this repository, including in forks and derived demo deployments, without attribution.

Layout:

- Only the folder named by `DEMO_MEDIA_VERSION` (currently `v2/`) is required and served.
- `<sku-lowercase>.webp`: one 800x800 WebP per demo SKU in `src/modules/products/core/application/seed/demo-products.ts`.
- Older version folders are optional history. Do not keep two folders with the same bytes; when photos change, create the new version folder, point `DEMO_MEDIA_VERSION` at it, and delete or leave the old folder only if you still need those URLs.

When a photo changes, add a new version folder and bump `DEMO_MEDIA_VERSION` in `src/modules/products/core/application/seed/demo-media.ts` so cached copies are replaced (Cache-Control is immutable for one year).
