import { UserQueryService } from '../../core/application/ports/user-query.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { UserListItemDTO } from '../../core/application/queries/results/user-list-item.result';
import { UserDetailDTO } from '../../core/application/queries/results/user-detail.result';

export class MockUserQueryService implements UserQueryService {
  list = jest.fn();
  getById = jest.fn();

  mockSuccessfulList(items: UserListItemDTO[], total?: number): void {
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

  mockSuccessfulGetById(detail: UserDetailDTO | null): void {
    this.getById.mockResolvedValue(Result.success(detail));
  }

  reset(): void {
    this.list.mockReset();
    this.getById.mockReset();
  }
}
