import {
  CartIndexSchema,
  InventoryIndexSchema,
  OrderIndexSchema,
  PaymentIndexSchema,
  ProductIndexSchema,
  UserIndexSchema,
} from '../../constants/redis.schemas';
import {
  CART_REDIS,
  INVENTORY_REDIS,
  ORDER_REDIS,
  PAYMENT_REDIS,
  PRODUCT_REDIS,
  USER_REDIS,
} from '../../constants/redis.constants';

export type RedisIndexDefinition = {
  index: string;
  schema: Record<string, unknown>;
  prefix: string;
};

/**
 * Factory for RediSearch index definitions used in initializer / recovery specs.
 */
export class RedisIndexTestFactory {
  static createDefinitions(): RedisIndexDefinition[] {
    return [
      {
        index: ORDER_REDIS.INDEX,
        schema: OrderIndexSchema,
        prefix: `${ORDER_REDIS.CACHE_KEY}:`,
      },
      {
        index: PRODUCT_REDIS.INDEX,
        schema: ProductIndexSchema,
        prefix: `${PRODUCT_REDIS.CACHE_KEY}:`,
      },
      {
        index: INVENTORY_REDIS.INDEX,
        schema: InventoryIndexSchema,
        prefix: `${INVENTORY_REDIS.CACHE_KEY}:`,
      },
      {
        index: CART_REDIS.INDEX,
        schema: CartIndexSchema,
        prefix: `${CART_REDIS.CACHE_KEY}:`,
      },
      {
        index: PAYMENT_REDIS.INDEX,
        schema: PaymentIndexSchema,
        prefix: `${PAYMENT_REDIS.CACHE_KEY}:`,
      },
      {
        index: USER_REDIS.INDEX,
        schema: UserIndexSchema,
        prefix: `${USER_REDIS.CACHE_KEY}:`,
      },
    ];
  }

  static createOrderIndexSchema(): Record<string, unknown> {
    return { ...OrderIndexSchema };
  }

  static createMinimalTextSchema(fieldPath = '$.id'): Record<string, unknown> {
    return { [fieldPath]: { type: 'TEXT' } };
  }
}
