import { Injectable, Logger } from '@nestjs/common';
import { AppError } from 'src/shared-kernel/domain/exceptions/app.error';
import { Result } from 'src/shared-kernel/domain/result';
import { BaseJobHandler } from 'src/infrastructure/jobs/base-job.handler';
import { DeliverNotificationService } from '../../core/application/services/deliver-notification.service';
import { INotification } from '../../core/domain/interfaces/notification.interface';
import { Notification } from '../../core/domain/entities/notification';
import { Job } from 'bullmq';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';

@Injectable()
export class DeliverNotificationProcess extends BaseJobHandler<
  INotification,
  void
> {
  protected readonly logger = new Logger(DeliverNotificationProcess.name);

  constructor(
    private readonly deliverNotificationService: DeliverNotificationService,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
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
