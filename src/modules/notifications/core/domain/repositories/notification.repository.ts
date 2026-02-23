import { Result } from 'src/shared-kernel/domain/result';
import { InfrastructureError } from 'src/shared-kernel/errors/infrastructure-error';
import { Notification } from '../entities/notification';

export abstract class NotificationRepository {
  abstract save(
    notification: Notification,
  ): Promise<Result<void, InfrastructureError>>;
  abstract findById(
    id: string,
  ): Promise<Result<Notification | null, InfrastructureError>>;
  abstract findByUserId(
    userId: string,
    options?: { page: number; limit: number; status?: string },
  ): Promise<
    Result<
      { data: Notification[]; total: number; unread: number },
      InfrastructureError
    >
  >;
  abstract markAsRead(
    id: string,
    userId: string,
  ): Promise<Result<void, InfrastructureError>>;
  abstract deleteExpired(): Promise<Result<void, InfrastructureError>>;
}
