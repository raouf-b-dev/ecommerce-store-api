import { Injectable } from '@nestjs/common';
import { FtSearchOptions } from 'redis';
import { RedisService } from '../redis.service';

@Injectable()
export class RedisSearchClient {
  constructor(private readonly redisService: RedisService) {}

  async search(index: string, query: string, options?: FtSearchOptions) {
    return this.redisService.search(index, query, options);
  }

  async createIndex(
    index: string,
    schema: any,
    prefix: string,
  ): Promise<boolean> {
    return this.redisService.createIndex(index, schema, prefix);
  }
}
