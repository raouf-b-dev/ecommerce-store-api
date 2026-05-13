import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver';
import { MetricsService } from '../metrics.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class InfraMetricsCollector {
  private readonly logger = new Logger(InfraMetricsCollector.name);

  constructor(
    private readonly metrics: MetricsService,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
    @InjectQueue('notifications') private readonly notifQueue: Queue,
  ) {}

  @Interval(60000)
  async collect(): Promise<void> {
    // 1. DB pool
    const driver = this.dataSource.driver as PostgresDriver;
    const pool = driver.master as
      | { totalCount?: number; idleCount?: number }
      | undefined;
    const totalCount = pool?.totalCount ?? 0;
    const idleCount = pool?.idleCount ?? 0;
    this.metrics.dbPoolActiveConnections.set(totalCount - idleCount);

    // 2. Redis
    const isRedisReady = this.redisService.client.isReady;
    this.metrics.redisHealthStatus.set(isRedisReady ? 1 : 0);

    // 3. BullMQ
    try {
      const notifCounts = await this.notifQueue.getJobCounts(
        'active',
        'waiting',
        'delayed',
      );
      this.metrics.bullmqQueueDepth.set(
        { queue: this.notifQueue.name },
        (notifCounts.active || 0) +
          (notifCounts.waiting || 0) +
          (notifCounts.delayed || 0),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.warn(`Failed to collect BullMQ metrics: ${message}`, stack);
    }
  }
}
