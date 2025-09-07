import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisSearchClient } from '../clients/redis-search.client';
import {
  OrderIndexSchema,
  ProductIndexSchema,
} from '../constants/redis.schemas';
import { Order_REDIS, Product_REDIS } from '../constants/redis.constants';

@Injectable()
export class RedisIndexInitializerService implements OnModuleInit {
  private readonly logger = new Logger(RedisIndexInitializerService.name);

  constructor(private readonly redisSearch: RedisSearchClient) {}

  async onModuleInit() {
    await this.ensureIndex(
      Order_REDIS.INDEX,
      OrderIndexSchema,
      Order_REDIS.CACHE_KEY,
    );

    await this.ensureIndex(
      Product_REDIS.INDEX,
      ProductIndexSchema,
      Product_REDIS.CACHE_KEY,
    );
  }

  private async ensureIndex(index: string, schema: any, prefix: string) {
    try {
      await this.redisSearch.createIndex(index, schema, `${prefix}:`);
      this.logger.log(`Redis index '${index}' created/ensured`);
    } catch (error: any) {
      if (error?.message?.includes('Index already exists')) {
        this.logger.log(`Redis index '${index}' already exists`);
        // Optional: validate schema and re-create if mismatch
      } else {
        this.logger.error(`Failed to create index '${index}'`, error);
      }
    }
  }
}
