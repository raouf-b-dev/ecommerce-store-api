import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/shared-kernel/domain/result';
import { UseCaseError } from 'src/shared-kernel/errors/usecase.error';
import { ErrorFactory } from 'src/shared-kernel/errors/error.factory';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';

export interface UpdateNotificationStatusRequest {
  notificationId: string;
  status: NotificationStatus;
  reason?: string;
}

@Injectable()
export class UpdateNotificationStatusService {
  private readonly logger = new Logger(UpdateNotificationStatusService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    request: UpdateNotificationStatusRequest,
  ): Promise<Result<void, UseCaseError>> {
    try {
      const { notificationId, status, reason } = request;

      const findResult =
        await this.notificationRepository.findById(notificationId);
      if (findResult.isFailure) return findResult;

      const notification = findResult.value;
      if (!notification) {
        return ErrorFactory.UseCaseError(
          `Notification ${notificationId} not found`,
        );
      }

      switch (status) {
        case NotificationStatus.DELIVERED:
          notification.markAsDelivered();
          break;
        case NotificationStatus.READ:
          notification.markAsRead();
          break;
        case NotificationStatus.FAILED:
          notification.markAsFailed(reason || 'Unknown error');
          break;
      }

      const saveResult = await this.notificationRepository.save(notification);
      if (saveResult.isFailure) return saveResult;

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Failed to update notification status',
        error,
      );
    }
  }
}
