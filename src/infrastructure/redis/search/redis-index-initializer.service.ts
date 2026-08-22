import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis.service';
import {
  OrderIndexSchema,
  InventoryIndexSchema,
  ProductIndexSchema,
  CartIndexSchema,
  PaymentIndexSchema,
  UserIndexSchema,
} from '../constants/redis.schemas';
import {
  INVENTORY_REDIS,
  ORDER_REDIS,
  PRODUCT_REDIS,
  CART_REDIS,
  PAYMENT_REDIS,
  USER_REDIS,
} from '../constants/redis.constants';
import { toError } from '../../../shared-kernel/infra/lang/error.utils';

@Injectable()
export class RedisIndexInitializerService implements OnModuleInit {
  private readonly logger = new Logger(RedisIndexInitializerService.name);

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    const isReady = await this.redisService.waitUntilReady();
    if (!isReady) {
      this.logger.warn(
        'Redis unavailable — skipping RediSearch index initialization',
      );
      return;
    }

    await Promise.all([
      this.ensureIndex(
        ORDER_REDIS.INDEX,
        OrderIndexSchema,
        ORDER_REDIS.CACHE_KEY,
      ),
      this.ensureIndex(
        PRODUCT_REDIS.INDEX,
        ProductIndexSchema,
        PRODUCT_REDIS.CACHE_KEY,
      ),
      this.ensureIndex(
        INVENTORY_REDIS.INDEX,
        InventoryIndexSchema,
        INVENTORY_REDIS.CACHE_KEY,
      ),
      this.ensureIndex(CART_REDIS.INDEX, CartIndexSchema, CART_REDIS.CACHE_KEY),
      this.ensureIndex(
        PAYMENT_REDIS.INDEX,
        PaymentIndexSchema,
        PAYMENT_REDIS.CACHE_KEY,
      ),
      this.ensureIndex(USER_REDIS.INDEX, UserIndexSchema, USER_REDIS.CACHE_KEY),
    ]);
  }

  private async ensureIndex(
    index: string,
    schema: Record<string, unknown>,
    prefix: string,
  ) {
    try {
      const created = await this.redisService.createIndex(
        index,
        schema,
        `${prefix}:`,
      );
      this.logger.log(
        created
          ? `Redis index '${index}' created`
          : `Redis index '${index}' already exists`,
      );
    } catch (error) {
      const err = toError(error);
      this.logger.error(`Failed to create index '${index}'`, err.stack);
    }
  }
}
