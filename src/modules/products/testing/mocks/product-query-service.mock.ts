import { ProductQueryService } from '../../core/application/ports/product-query.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { ProductListItemDTO } from '../../core/application/queries/results/product-list-item.result';
import { ProductDetailDTO } from '../../core/application/queries/results/product-detail.result';

export class MockProductQueryService implements ProductQueryService {
  list = jest.fn();
  getById = jest.fn();
  getBySlug = jest.fn();

  mockSuccessfulList(items: ProductListItemDTO[], total?: number): void {
    const listTotal = total ?? items.length;
    this.list.mockResolvedValue(
      Result.success({
        items,
        total: listTotal,
        page: 1,
        limit: 10,
        totalPages: Math.ceil(listTotal / 10) || 1,
      }),
    );
  }

  mockSuccessfulGetById(detail: ProductDetailDTO | null): void {
    this.getById.mockResolvedValue(Result.success(detail));
  }

  mockSuccessfulGetBySlug(detail: ProductDetailDTO | null): void {
    this.getBySlug.mockResolvedValue(Result.success(detail));
  }

  reset(): void {
    this.list.mockReset();
    this.getById.mockReset();
    this.getBySlug.mockReset();
  }
}
