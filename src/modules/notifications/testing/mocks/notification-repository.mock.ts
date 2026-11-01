import { NotificationRepository } from '../../core/domain/repositories/notification.repository';
import { Notification } from '../../core/domain/entities/notification';
import { Result } from 'src/shared-kernel/domain/result';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';

export class MockNotificationRepository implements NotificationRepository {
  findById = jest.fn<
    Promise<Result<Notification | null, InfrastructureError>>,
    [string]
  >();
  save = jest.fn<Promise<Result<void, InfrastructureError>>, [Notification]>();
  findByUserId = jest.fn<
    Promise<
      Result<
        { data: Notification[]; total: number; unread: number },
        InfrastructureError
      >
    >,
    [string, { page: number; limit: number; status?: string } | undefined]
  >();
  markAsRead = jest.fn<
    Promise<Result<void, InfrastructureError>>,
    [string, string]
  >();
  deleteExpired = jest.fn<Promise<Result<void, InfrastructureError>>, []>();

  mockSuccessfulFind(notification: Notification | null): void {
    this.findById.mockResolvedValue(Result.success(notification));
  }

  mockFindFailure(message: string): void {
    this.findById.mockResolvedValue(
      Result.failure(new InfrastructureError(message)),
    );
  }

  mockSuccessfulSave(): void {
    this.save.mockResolvedValue(Result.success(undefined));
  }

  reset(): void {
    jest.clearAllMocks();
  }
}
