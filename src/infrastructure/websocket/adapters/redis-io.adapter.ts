import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { EnvConfigService } from 'src/config/env-config.service';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(RedisIoAdapter.name);
  private pubClient: ReturnType<typeof createClient>;
  private subClient: ReturnType<typeof createClient>;

  constructor(private app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const configService = this.app.get(EnvConfigService);
    const redisConfig = configService.redis;

    this.pubClient = createClient({
      url: `redis://${redisConfig.host}:${redisConfig.port}`,
      password: redisConfig.password,
      database: redisConfig.db,
    });

    this.subClient = this.pubClient.duplicate();

    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    this.logger.log('RedisIoAdapter connected to Redis');
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }

  /**
   * Called by NestJS SocketModule during application shutdown.
   * Idempotent — safe to call multiple times (quit on a closed client is caught).
   */
  async close(): Promise<void> {
    await Promise.all([
      this.pubClient?.quit().catch((err: unknown) => {
        this.logger.debug(`pubClient already closed: ${String(err)}`);
      }),
      this.subClient?.quit().catch((err: unknown) => {
        this.logger.debug(`subClient already closed: ${String(err)}`);
      }),
    ]);
    this.logger.log('RedisIoAdapter connections closed');
  }
}
