import { Injectable, Logger } from '@nestjs/common';
import { RedisSearchClient } from '../commands/redis-search.client';
import { OrderIndexSchema } from '../constants/redis.schemas';
import { Order_REDIS } from '../constants/redis.constants';

@Injectable()
export class RedisIndexInitializerService {
  private readonly logger = new Logger(RedisIndexInitializerService.name);

  constructor(private readonly redisSearch: RedisSearchClient) {}

  async onModuleInit() {
    await this.initOrderIndex();
  }

  private async initOrderIndex() {
    try {
      await this.redisSearch.createIndex(
        Order_REDIS.INDEX,
        OrderIndexSchema,
        `${Order_REDIS.CACHE_KEY}:`,
      );
      this.logger.log(`Redis index '${Order_REDIS.INDEX}' initialized`);
    } catch (error) {
      if (error?.message?.includes('Index already exists')) {
        this.logger.log(`Redis index '${Order_REDIS.INDEX}' already exists`);
      } else {
        this.logger.error(
          `Failed to create index '${Order_REDIS.INDEX}'`,
          error,
        );
      }
    }
  }
}
