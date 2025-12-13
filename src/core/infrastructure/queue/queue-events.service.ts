import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { QueueEvents } from 'bullmq';
import { EnvConfigService } from '../../../config/env-config.service';

export type QueueEventHandler = (args: {
  jobId: string;
  failedReason?: string;
  returnvalue?: string;
}) => void | Promise<void>;

@Injectable()
export class QueueEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueEventsService.name);
  private readonly queueEventsMap = new Map<string, QueueEvents>();
  private readonly eventHandlers = new Map<
    string,
    Map<string, QueueEventHandler[]>
  >();

  constructor(private readonly envConfigService: EnvConfigService) {}

  onModuleInit() {
    this.logger.log('QueueEventsService initialized');
  }

  async onModuleDestroy() {
    for (const queueEvents of this.queueEventsMap.values()) {
      await queueEvents.close();
    }
    this.queueEventsMap.clear();
    this.eventHandlers.clear();
  }

  private getOrCreateQueueEvents(queueName: string): QueueEvents {
    if (!this.queueEventsMap.has(queueName)) {
      const queueEvents = new QueueEvents(queueName, {
        connection: {
          host: this.envConfigService.redis.host,
          port: this.envConfigService.redis.port,
          password: this.envConfigService.redis.password,
          db: this.envConfigService.redis.db,
        },
        prefix: this.envConfigService.redis.key_prefix,
      });
      this.queueEventsMap.set(queueName, queueEvents);
      this.setupEventForwarding(queueName, queueEvents);
    }
    return this.queueEventsMap.get(queueName)!;
  }

  private setupEventForwarding(queueName: string, queueEvents: QueueEvents) {
    queueEvents.on('failed', ({ jobId, failedReason }) => {
      void (async () => {
        const handlers = this.getHandlers(queueName, 'failed');
        for (const handler of handlers) {
          try {
            await handler({ jobId, failedReason });
          } catch (error) {
            this.logger.error(
              `Error in failed event handler for queue ${queueName}:`,
              error,
            );
          }
        }
      })();
    });

    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      void (async () => {
        const handlers = this.getHandlers(queueName, 'completed');
        for (const handler of handlers) {
          try {
            await handler({ jobId, returnvalue });
          } catch (error) {
            this.logger.error(
              `Error in completed event handler for queue ${queueName}:`,
              error,
            );
          }
        }
      })();
    });
  }

  private getHandlers(queueName: string, event: string): QueueEventHandler[] {
    return this.eventHandlers.get(queueName)?.get(event) || [];
  }

  onFailed(queueName: string, handler: QueueEventHandler) {
    this.registerHandler(queueName, 'failed', handler);
  }

  onCompleted(queueName: string, handler: QueueEventHandler) {
    this.registerHandler(queueName, 'completed', handler);
  }

  private registerHandler(
    queueName: string,
    event: string,
    handler: QueueEventHandler,
  ) {
    this.getOrCreateQueueEvents(queueName);

    if (!this.eventHandlers.has(queueName)) {
      this.eventHandlers.set(queueName, new Map());
    }
    const queueHandlers = this.eventHandlers.get(queueName)!;

    if (!queueHandlers.has(event)) {
      queueHandlers.set(event, []);
    }
    queueHandlers.get(event)!.push(handler);
  }
}
