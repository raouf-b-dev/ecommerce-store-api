import { ProductListItemDTO } from '../../../core/application/queries/results/product-list-item.result';
import { ProductDetailDTO } from '../../../core/application/queries/results/product-detail.result';
import { RawProductListQueryRow } from '../../dto/raw-product-list-query-row.interface';

function toIsoTimestamp(
  value: Date | string | undefined,
  fallback: string,
): string {
  if (!value) {
    return fallback;
  }
  return value instanceof Date ? value.toISOString() : String(value);
}

export class ProductQueryMapper {
  static toListItemDto(row: RawProductListQueryRow): ProductListItemDTO {
    const createdAt = toIsoTimestamp(
      row.createdAt,
      new Date(0).toISOString(),
    );

    return {
      id: Number(row.id),
      name: String(row.name || ''),
      slug: String(row.slug || ''),
      sku: row.sku || 'N/A',
      price: Number(row.price || 0),
      currency: row.currency || 'USD',
      imageUrl: row.imageUrl || null,
      categoryId: row.categoryId ? Number(row.categoryId) : null,
      categoryName: row.categoryName != null ? String(row.categoryName) : null,
      isActive: Boolean(row.isActive),
      createdAt,
      updatedAt: toIsoTimestamp(row.updatedAt, createdAt),
    };
  }

  static toDetailDto(row: RawProductListQueryRow): ProductDetailDTO {
    return {
      ...this.toListItemDto(row),
      description: row.description || null,
    };
  }
}
