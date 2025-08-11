interface IRedisContstant {
  INDEX: string;
  CACHE_KEY: string;
  IS_CACHED_FLAG: string;
  EXPIRATION: number; // 7 days
}
export const Order_REDIS: IRedisContstant = {
  INDEX: 'order_index',
  CACHE_KEY: 'order_cache',
  IS_CACHED_FLAG: 'order_list:isCached',
  EXPIRATION: 3600 * 24 * 7, // 7 days
};

export const Product_REDIS: IRedisContstant = {
  INDEX: 'product_index',
  CACHE_KEY: 'product_cache',
  IS_CACHED_FLAG: 'product_list:isCached',
  EXPIRATION: 3600 * 24 * 7, // 7 days
};
