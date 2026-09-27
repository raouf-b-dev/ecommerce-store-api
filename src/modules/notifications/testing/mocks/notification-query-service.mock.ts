import { NotificationQueryService } from '../../core/application/ports/notification-query.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { NotificationListItemDTO } from '../../core/application/queries/results/notification-list-item.result';

export class MockNotificationQueryService implements NotificationQueryService {
  list = jest.fn();
  getById = jest.fn();

  mockSuccessfulList(items: NotificationListItemDTO[], total?: number): void {
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

  mockSuccessfulGetById(detail: NotificationListItemDTO | null): void {
    this.getById.mockResolvedValue(Result.success(detail));
  }

  reset(): void {
    this.list.mockReset();
    this.getById.mockReset();
  }
}
