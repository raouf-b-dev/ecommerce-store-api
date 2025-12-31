import { Injectable, Logger } from '@nestjs/common';
import { AppError } from 'src/core/errors/app.error';
import { Result } from 'src/core/domain/result';
import { BaseJobHandler } from 'src/core/infrastructure/jobs/base-job.handler';
import { SaveNotificationHistoryService } from '../../application/services/save-notification-history.service';
import { INotification } from '../../domain/interfaces/notification.interface';
import { Notification } from '../../domain/entities/notification';
import { Job } from 'bullmq';

@Injectable()
export class SaveNotificationHistoryProcess extends BaseJobHandler<
  INotification,
  void
> {
  protected readonly logger = new Logger(SaveNotificationHistoryProcess.name);

  constructor(
    private readonly saveNotificationHistoryService: SaveNotificationHistoryService,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<INotification>,
  ): Promise<Result<void, AppError>> {
    const notification = Notification.fromPrimitives(job.data);
    return this.saveNotificationHistoryService.execute({ notification });
  }
}
