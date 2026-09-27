import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';

export interface ProcessHealthDetails extends Record<string, unknown> {
  eventLoopLagMs: number;
  maxEventLoopLagMs: number;
  rssBytes: number;
  maxRssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  message?: string;
}

@Injectable()
export class ProcessHealthIndicator {
  private static readonly MAX_EVENT_LOOP_LAG_MS = 500;
  private static readonly MAX_RSS_MEMORY_BYTES = 450 * 1024 * 1024;

  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy<K extends string = string>(
    key: K,
  ): Promise<HealthIndicatorResult<K>> {
    const indicator = this.healthIndicatorService.check(key);

    const lag = await this.measureEventLoopLag();
    const memory = process.memoryUsage();
    const rss = memory.rss;

    const isLagOk = lag <= ProcessHealthIndicator.MAX_EVENT_LOOP_LAG_MS;
    const isMemoryOk = rss <= ProcessHealthIndicator.MAX_RSS_MEMORY_BYTES;

    const details: ProcessHealthDetails = {
      eventLoopLagMs: Math.round(lag),
      maxEventLoopLagMs: ProcessHealthIndicator.MAX_EVENT_LOOP_LAG_MS,
      rssBytes: rss,
      maxRssBytes: ProcessHealthIndicator.MAX_RSS_MEMORY_BYTES,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
    };

    if (isLagOk && isMemoryOk) {
      return indicator.up(details);
    }

    const failureReasons: string[] = [];
    if (!isLagOk) {
      failureReasons.push(
        `Event loop lag exceeds threshold (${Math.round(lag)}ms > ${ProcessHealthIndicator.MAX_EVENT_LOOP_LAG_MS}ms)`,
      );
    }
    if (!isMemoryOk) {
      failureReasons.push(
        `RSS memory exceeds threshold (${Math.round(rss / 1024 / 1024)}MB > ${Math.round(ProcessHealthIndicator.MAX_RSS_MEMORY_BYTES / 1024 / 1024)}MB)`,
      );
    }

    return indicator.down({
      ...details,
      message: failureReasons.join('; '),
    });
  }

  private measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      setTimeout(() => {
        resolve(Date.now() - start);
      }, 0);
    });
  }
}
