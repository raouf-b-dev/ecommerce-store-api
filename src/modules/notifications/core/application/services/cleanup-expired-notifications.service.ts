import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/shared-kernel/domain/result';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';
import { NotificationRepository } from '../../domain/repositories/notification.repository';

@Injectable()
export class CleanupExpiredNotificationsService {
  private readonly logger = new Logger(CleanupExpiredNotificationsService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(): Promise<Result<void, UseCaseError>> {
    try {
      this.logger.log('Cleaning up expired notifications');

      const result = await this.notificationRepository.deleteExpired();
      if (result.isFailure) return result;

      this.logger.log('Successfully cleaned up expired notifications');

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Failed to cleanup expired notifications',
        error,
      );
    }
  }
}
