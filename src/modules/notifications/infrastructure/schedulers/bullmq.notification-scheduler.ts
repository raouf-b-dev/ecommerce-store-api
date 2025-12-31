import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Result } from 'src/core/domain/result';
import { InfrastructureError } from 'src/core/errors/infrastructure-error';
import { ErrorFactory } from 'src/core/errors/error.factory';
import { JobNames } from 'src/core/infrastructure/jobs/job-names';
import { FlowProducerService } from 'src/core/infrastructure/queue/flow-producer.service';
import { JobConfigService } from 'src/core/infrastructure/jobs/job-config.service';
import { FlowJob, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Notification } from '../../domain/entities/notification';
import { NotificationScheduler } from '../../domain/schedulers/notification.scheduler';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';

@Injectable()
export class BullMqNotificationScheduler
  implements NotificationScheduler, OnModuleInit
{
  private readonly logger = new Logger(BullMqNotificationScheduler.name);

  constructor(
    private readonly flowProducerService: FlowProducerService,
    private readonly jobConfig: JobConfigService,
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.scheduleCleanupJob();
  }

  private async scheduleCleanupJob() {
    const jobName = JobNames.CLEANUP_NOTIFICATIONS;
    const cron = '0 3 * * *';
    const jobId = 'cleanup-expired-notifications-job';

    try {
      await this.notificationQueue.add(
        jobName,
        {},
        {
          repeat: { pattern: cron },
          jobId,
        },
      );
      this.logger.log('Cleanup job scheduled successfully');
    } catch (error) {
      this.logger.error('Failed to schedule cleanup job', error);
    }
  }

  async scheduleNotification(
    notification: Notification,
  ): Promise<Result<{ jobId: string }, InfrastructureError>> {
    try {
      const flowId = this.jobConfig.generateJobId(JobNames.SEND_NOTIFICATION);
      const notificationData = notification.toPrimitives();

      const flowDefinition: FlowJob = {
        name: JobNames.UPDATE_NOTIFICATION_STATUS,
        queueName: 'notifications',
        data: {
          notificationId: notification.id,
          status: NotificationStatus.DELIVERED,
        },
        opts: {
          jobId: `${flowId}-update-status`,
          ...this.jobConfig.getJobOptions(JobNames.UPDATE_NOTIFICATION_STATUS),
        },
        children: [
          {
            name: JobNames.SEND_NOTIFICATION,
            queueName: 'notifications',
            data: notificationData,
            opts: {
              jobId: `${flowId}-send`,
              ...this.jobConfig.getJobOptions(JobNames.SEND_NOTIFICATION),
            },
            children: [
              {
                name: JobNames.SAVE_NOTIFICATION_HISTORY,
                queueName: 'notifications',
                data: notificationData,
                opts: {
                  jobId: `${flowId}-save`,
                  ...this.jobConfig.getJobOptions(
                    JobNames.SAVE_NOTIFICATION_HISTORY,
                  ),
                },
              },
            ],
          },
        ],
      };

      const flow = await this.flowProducerService.add(flowDefinition);

      if (!flow.job.id) {
        return ErrorFactory.InfrastructureError(
          'Failed to schedule notification flow',
        );
      }

      this.logger.log(
        `Scheduled notification flow ${flowId} for notification ${notification.id}`,
      );

      return Result.success({ jobId: flowId });
    } catch (error) {
      this.logger.error('Failed to schedule notification', error.stack);
      return ErrorFactory.InfrastructureError(
        'Failed to schedule notification',
        error,
      );
    }
  }
}
