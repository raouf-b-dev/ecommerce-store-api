import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/shared-kernel/domain/result';
import { UseCaseError } from 'src/shared-kernel/errors/usecase.error';
import { ErrorFactory } from 'src/shared-kernel/errors/error.factory';
import { Notification } from '../../domain/entities/notification';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';

export interface GetUserNotificationsRequest {
  userId: string;
  page: number;
  limit: number;
  status?: NotificationStatus;
}

export interface GetUserNotificationsResponse {
  data: Notification[];
  total: number;
  unread: number;
}

@Injectable()
export class GetUserNotificationsUseCase {
  private readonly logger = new Logger(GetUserNotificationsUseCase.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    request: GetUserNotificationsRequest,
  ): Promise<Result<GetUserNotificationsResponse, UseCaseError>> {
    try {
      const { userId, page, limit, status } = request;

      const result = await this.notificationRepository.findByUserId(userId, {
        page,
        limit,
        status,
      });

      if (result.isFailure) return result;

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.UseCaseError('Failed to fetch notifications', error);
    }
  }
}
