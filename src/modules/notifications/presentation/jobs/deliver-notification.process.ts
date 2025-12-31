import { Injectable, Logger } from '@nestjs/common';
import { AppError } from 'src/core/errors/app.error';
import { Result } from 'src/core/domain/result';
import { BaseJobHandler } from 'src/core/infrastructure/jobs/base-job.handler';
import { DeliverNotificationService } from '../../application/services/deliver-notification.service';
import { INotification } from '../../domain/interfaces/notification.interface';
import { Notification } from '../../domain/entities/notification';
import { Job } from 'bullmq';

@Injectable()
export class DeliverNotificationProcess extends BaseJobHandler<
  INotification,
  void
> {
  protected readonly logger = new Logger(DeliverNotificationProcess.name);

  constructor(
    private readonly deliverNotificationService: DeliverNotificationService,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<INotification>,
  ): Promise<Result<void, AppError>> {
    const props = job.data;
    const notification = Notification.fromPrimitives(props);

    try {
      await this.deliverNotificationService.execute(notification);
      return Result.success(undefined);
    } catch (error) {
      this.logger.error(
        `Failed to send notification via WebSocket: ${error.message}`,
      );
      return Result.success(undefined); // Don't fail the job if WS fails? Or maybe retry?
    }
  }
}
