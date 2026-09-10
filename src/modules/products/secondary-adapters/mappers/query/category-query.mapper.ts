import { CategoryResult } from '../../../core/application/queries/results/category.result';
import { RawCategoryQueryRow } from '../../dto/raw-category-query-row.interface';

export class CategoryQueryMapper {
  static toResult(row: RawCategoryQueryRow): CategoryResult {
    const productCount = Number(row.productCount ?? 0);

    return {
      id: Number(row.id),
      name: String(row.name || ''),
      slug: String(row.slug || ''),
      description: row.description ?? null,
      isActive: Boolean(row.isActive),
      productCount:
        Number.isFinite(productCount) && productCount >= 0
          ? Math.trunc(productCount)
          : 0,
    };
  }
}
