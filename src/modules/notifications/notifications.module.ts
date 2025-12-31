import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WebsocketModule } from 'src/core/infrastructure/websocket/websocket.module';
import { NotificationEntity } from './infrastructure/orm/notification.schema';
import { PostgresNotificationRepository } from './infrastructure/repositories/postgres.notification.repository';
import { NotificationRepository } from './domain/repositories/notification.repository';
import { NotificationGateway } from './domain/gateways/notification.gateway.interface';
import { WebsocketNotificationGateway } from './infrastructure/gateways/websocket.notification.gateway';
import { DeliverNotificationService } from './application/services/deliver-notification.service';
import { SaveNotificationHistoryService } from './application/services/save-notification-history.service';
import { UpdateNotificationStatusService } from './application/services/update-notification-status.service';
import { CleanupExpiredNotificationsService } from './application/services/cleanup-expired-notifications.service';
import { GetUserNotificationsUseCase } from './application/usecases/get-user-notifications.usecase';
import { MarkNotificationAsReadUseCase } from './application/usecases/mark-notification-as-read.usecase';
import { NotificationsController } from './notifications.controller';
import { GetUserNotificationsController } from './presentation/controllers/get-user-notifications.controller';
import { MarkNotificationAsReadController } from './presentation/controllers/mark-notification-as-read.controller';
import { NotificationScheduler } from './domain/schedulers/notification.scheduler';
import { BullMqNotificationScheduler } from './infrastructure/schedulers/bullmq.notification-scheduler';
import { DeliverNotificationProcess } from './presentation/jobs/deliver-notification.process';
import { SaveNotificationHistoryProcess } from './presentation/jobs/save-notification-history.process';
import { UpdateNotificationStatusProcess } from './presentation/jobs/update-notification-status.process';
import { CleanupExpiredNotificationsProcess } from './presentation/jobs/cleanup-expired-notifications.process';
import { NotificationsProcessor } from './notifications.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    WebsocketModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    // Infrastructure
    {
      provide: NotificationRepository,
      useClass: PostgresNotificationRepository,
    },
    {
      provide: NotificationGateway,
      useClass: WebsocketNotificationGateway,
    },
    {
      provide: NotificationScheduler,
      useClass: BullMqNotificationScheduler,
    },

    // Application Services
    DeliverNotificationService,
    SaveNotificationHistoryService,
    UpdateNotificationStatusService,
    CleanupExpiredNotificationsService,

    // Use Cases
    GetUserNotificationsUseCase,
    MarkNotificationAsReadUseCase,

    // Controllers (Delegates)
    GetUserNotificationsController,
    MarkNotificationAsReadController,

    // Jobs (Processes)
    DeliverNotificationProcess,
    SaveNotificationHistoryProcess,
    UpdateNotificationStatusProcess,
    CleanupExpiredNotificationsProcess,

    // Processor
    NotificationsProcessor,
  ],
  exports: [DeliverNotificationService],
})
export class NotificationsModule {}
