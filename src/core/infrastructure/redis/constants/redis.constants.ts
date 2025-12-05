interface IRedisContstant {
  INDEX: string;
  CACHE_KEY: string;
  IS_CACHED_FLAG: string;
  EXPIRATION: number; // 7 days
}
export const ORDER_REDIS: IRedisContstant = {
  INDEX: 'order_index',
  CACHE_KEY: 'order_cache',
  IS_CACHED_FLAG: 'order_list:isCached',
  EXPIRATION: 3600 * 24 * 7, // 7 days
};

export const PRODUCT_REDIS: IRedisContstant = {
  INDEX: 'product_index',
  CACHE_KEY: 'product_cache',
  IS_CACHED_FLAG: 'product_list:isCached',
  EXPIRATION: 3600 * 24 * 7, // 7 days
};

export const INVENTORY_REDIS: IRedisContstant = {
  INDEX: 'order_index',
  CACHE_KEY: 'order_cache',
  IS_CACHED_FLAG: 'order_list:isCached',
  EXPIRATION: 3600 * 24 * 7, // 7 days
};

export const CART_REDIS: IRedisContstant = {
  INDEX: 'cart_index',
  CACHE_KEY: 'cart_cache',
  IS_CACHED_FLAG: 'cart_list:isCached',
  EXPIRATION: 3600 * 24 * 7, // 7 days
};

export const PAYMENT_REDIS: IRedisContstant = {
  INDEX: 'payment_index',
  CACHE_KEY: 'payment_cache',
  IS_CACHED_FLAG: 'payment_list:isCached',
  EXPIRATION: 3600 * 24 * 7, // 7 days
};

export const CUSTOMER_REDIS: IRedisContstant = {
  INDEX: 'customer_index',
  CACHE_KEY: 'customer_cache',
  IS_CACHED_FLAG: 'customer_list:isCached',
  EXPIRATION: 3600 * 24 * 7, // 7 days
};

export const USER_REDIS: IRedisContstant = {
  INDEX: 'user_index',
  CACHE_KEY: 'user_cache',
  IS_CACHED_FLAG: 'user_list:isCached',
  EXPIRATION: 3600 * 24 * 7, // 7 days
};
