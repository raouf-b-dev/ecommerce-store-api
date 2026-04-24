import { BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common';
import { RedisIoAdapter } from './adapters/redis-io.adapter';

@Injectable()
export class RedisIoAdapterHost implements BeforeApplicationShutdown {
  private readonly logger = new Logger(RedisIoAdapterHost.name);
  private adapter: RedisIoAdapter | null = null;

  setAdapter(adapter: RedisIoAdapter) {
    this.adapter = adapter;
  }

  async beforeApplicationShutdown() {
    if (this.adapter) {
      this.logger.log('Closing RedisIoAdapter pub/sub connections...');
      await this.adapter.close();
    }
  }
}
