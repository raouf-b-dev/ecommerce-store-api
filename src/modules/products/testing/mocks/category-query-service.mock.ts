import { CategoryQueryService } from '../../core/application/ports/category-query.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { CategoryResult } from '../../core/application/queries/results/category.result';

export class MockCategoryQueryService implements CategoryQueryService {
  list = jest.fn();
  getById = jest.fn();

  mockSuccessfulList(items: CategoryResult[]): void {
    this.list.mockResolvedValue(Result.success(items));
  }

  mockSuccessfulGetById(item: CategoryResult | null): void {
    this.getById.mockResolvedValue(Result.success(item));
  }

  reset(): void {
    this.list.mockReset();
    this.getById.mockReset();
  }
}
