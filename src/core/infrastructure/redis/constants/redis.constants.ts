interface IRedisContstant {
  INDEX: string;
  CACHE_KEY: string;
  IS_CACHED_FLAG: string;
  EXPIRATION: number; // 7 days
}
export const Order_REDIS: IRedisContstant = {
  INDEX: 'order_index',
  CACHE_KEY: 'order_cache',
  IS_CACHED_FLAG: 'users_list:isCached',
  EXPIRATION: 3600 * 24 * 7, // 7 days
};
