import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { EnvConfigService } from '../../../config/env-config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public client: any;

  constructor(private envConfigService: EnvConfigService) {}

  async onModuleInit() {
    this.client = createClient({
      url: `redis://${this.envConfigService.redis.host}:${this.envConfigService.redis.port}`,
      password: this.envConfigService.redis.password,
      database: this.envConfigService.redis.db,
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client && typeof this.client.quit === 'function') {
      await this.client.quit();
    }
  }

  public getFullKey(key: string): string {
    const prefix = this.envConfigService.redis.key_prefix;
    return `${prefix}${key}`;
  }

  public removePrefix(fullKey: string): string {
    const prefix = this.envConfigService.redis.key_prefix;
    return fullKey.startsWith(prefix) ? fullKey.slice(prefix.length) : fullKey;
  }
}
