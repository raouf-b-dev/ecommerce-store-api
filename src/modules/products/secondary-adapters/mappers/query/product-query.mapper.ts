import { ProductListItemDTO } from '../../../core/application/queries/results/product-list-item.result';
import { ProductDetailDTO } from '../../../core/application/queries/results/product-detail.result';
import { RawProductListQueryRow } from '../../dto/raw-product-list-query-row.interface';

export class ProductQueryMapper {
  static toListItemDto(row: RawProductListQueryRow): ProductListItemDTO {
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
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
    };
  }

  static toDetailDto(row: RawProductListQueryRow): ProductDetailDTO {
    const base = this.toListItemDto(row);
    return {
      ...base,
      description: row.description || null,
      updatedAt: row.updatedAt
        ? row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : String(row.updatedAt)
        : base.createdAt,
    };
  }
}
