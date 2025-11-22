import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisSearchClient } from '../clients/redis-search.client';
import {
  OrderIndexSchema,
  InventoryIndexSchema,
  ProductIndexSchema,
  CartIndexSchema,
  PaymentIndexSchema,
} from '../constants/redis.schemas';
import {
  INVENTORY_REDIS,
  ORDER_REDIS,
  PRODUCT_REDIS,
  CART_REDIS,
  PAYMENT_REDIS,
} from '../constants/redis.constants';

@Injectable()
export class RedisIndexInitializerService implements OnModuleInit {
  private readonly logger = new Logger(RedisIndexInitializerService.name);

  constructor(private readonly redisSearch: RedisSearchClient) {}

  async onModuleInit() {
    await this.ensureIndex(
      ORDER_REDIS.INDEX,
      OrderIndexSchema,
      ORDER_REDIS.CACHE_KEY,
    );

    await this.ensureIndex(
      PRODUCT_REDIS.INDEX,
      ProductIndexSchema,
      PRODUCT_REDIS.CACHE_KEY,
    );

    await this.ensureIndex(
      INVENTORY_REDIS.INDEX,
      InventoryIndexSchema,
      INVENTORY_REDIS.CACHE_KEY,
    );

    await this.ensureIndex(
      CART_REDIS.INDEX,
      CartIndexSchema,
      CART_REDIS.CACHE_KEY,
    );

    await this.ensureIndex(
      PAYMENT_REDIS.INDEX,
      PaymentIndexSchema,
      PAYMENT_REDIS.CACHE_KEY,
    );
  }

  private async ensureIndex(index: string, schema: any, prefix: string) {
    try {
      await this.redisSearch.createIndex(index, schema, `${prefix}:`);
      this.logger.log(`Redis index '${index}' created/ensured`);
    } catch (error: any) {
      if (error?.message?.includes('Index already exists')) {
        this.logger.log(`Redis index '${index}' already exists`);
      } else {
        this.logger.error(`Failed to create index '${index}'`, error);
      }
    }
  }
}
