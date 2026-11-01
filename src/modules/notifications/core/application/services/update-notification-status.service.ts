import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/shared-kernel/domain/result';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';
import { ErrorCode } from 'src/shared-kernel/domain/exceptions/error-code';
import { ErrorKind } from 'src/shared-kernel/domain/exceptions/error-kind';
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
    const { notificationId, status, reason } = request;

    const findResult =
      await this.notificationRepository.findById(notificationId);
    if (findResult.isFailure) return findResult;

    const notification = findResult.value;
    if (!notification) {
      return ErrorFactory.UseCaseError(
        `Notification ${notificationId} not found`,
        {
          kind: ErrorKind.NOT_FOUND,
          code: ErrorCode.NOTIFICATION_NOT_FOUND,
        },
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
  }
}
