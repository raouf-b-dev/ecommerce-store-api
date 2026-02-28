import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/shared-kernel/domain/result';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';
import { NotificationRepository } from '../../domain/repositories/notification.repository';

@Injectable()
export class MarkNotificationAsReadUseCase {
  private readonly logger = new Logger(MarkNotificationAsReadUseCase.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    id: string,
    userId: string,
  ): Promise<Result<void, UseCaseError>> {
    try {
      const result = await this.notificationRepository.markAsRead(id, userId);
      if (result.isFailure) return result;

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Failed to mark notification as read',
        error,
      );
    }
  }
}
