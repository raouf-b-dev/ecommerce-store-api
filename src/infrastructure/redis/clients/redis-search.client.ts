import { Injectable } from '@nestjs/common';
import { FtSearchOptions } from 'redis';
import { RedisService } from '../redis.service';

@Injectable()
export class RedisSearchClient {
  constructor(private readonly redisService: RedisService) {}

  async search(index: string, query: string, options?: FtSearchOptions) {
    const fullIndex = this.redisService.getFullKey(index);
    return await this.redisService.client.ft.search(fullIndex, query, options);
  }

  async createIndex(index: string, schema: any, prefix: string): Promise<void> {
    const fullIndex = this.redisService.getFullKey(index);
    const fullPrefix = this.redisService.getFullKey(prefix);
    await this.redisService.client.ft.create(fullIndex, schema, {
      ON: 'JSON',
      PREFIX: [fullPrefix],
    });
  }
}
