import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/shared-kernel/domain/result';
import { UseCaseError } from 'src/shared-kernel/errors/usecase.error';
import { ErrorFactory } from 'src/shared-kernel/errors/error.factory';
import { Notification } from '../../domain/entities/notification';
import { NotificationRepository } from '../../domain/repositories/notification.repository';

export interface SaveNotificationHistoryRequest {
  notification: Notification;
}

@Injectable()
export class SaveNotificationHistoryService {
  private readonly logger = new Logger(SaveNotificationHistoryService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    request: SaveNotificationHistoryRequest,
  ): Promise<Result<void, UseCaseError>> {
    try {
      const { notification } = request;

      this.logger.log(`Saving notification ${notification.id} to history`);

      const saveResult = await this.notificationRepository.save(notification);
      if (saveResult.isFailure) {
        return ErrorFactory.UseCaseError(
          'Failed to save notification history',
          saveResult.error,
        );
      }

      this.logger.log(
        `Successfully saved notification ${notification.id} to history`,
      );

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Failed to save notification history',
        error,
      );
    }
  }
}
