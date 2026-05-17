import { EnvConfigService } from '../../config/env-config.service';
import { IAppConfig, AppConfigKey } from '../../config/configuration';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MockEnvConfigService extends EnvConfigService {
  constructor() {
    super({
      get: jest.fn((key: string) => (this as any).mockConfig[key]),
    } as any);
  }

  private mockConfig: IAppConfig = {
    jwt: {
      refreshTokenTtl: '7d',
      accessTokenTtl: '1h',
      privateKey: 'test-private-key',
    },
    node: {
      env: 'test',
      port: 3000,
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: '',
      key_prefix: 'test:',
      db: 0,
    },
    postgres: {
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: 'password',
      database: 'test-db',
    },
    logging: {
      level: 'info',
      dir: 'logs',
      transport: 'console',
    },
    cors: {
      allowedOrigins: ['*'],
    },
    throttle: {
      globalLimit: 10,
      strictLimit: 5,
    },
    metricsApiKey: 'test-key',
    otel: {
      tracingEnabled: false,
      exporterEndpoint: 'http://localhost:4317',
    },
  };

  override get<T extends AppConfigKey>(key: T): IAppConfig[T] {
    const value = this.mockConfig[key];
    if (value === undefined || value === null) {
      throw new Error(`${key} is not defined in mock config`);
    }
    return value;
  }

  override get jwt() {
    return this.mockConfig.jwt;
  }

  override get node() {
    return this.mockConfig.node;
  }

  override get redis() {
    return this.mockConfig.redis;
  }

  override get postgres() {
    return this.mockConfig.postgres;
  }

  override get logLevel() {
    return this.mockConfig.logging.level;
  }

  override get logDir() {
    return this.mockConfig.logging.dir;
  }

  override get logTransport() {
    return this.mockConfig.logging.transport;
  }

  override get cors() {
    return this.mockConfig.cors;
  }

  override get throttle() {
    return this.mockConfig.throttle;
  }

  override get metricsApiKey() {
    return this.mockConfig.metricsApiKey;
  }

  override get otel() {
    return this.mockConfig.otel;
  }

  setMockConfig(config: Partial<IAppConfig>) {
    this.mockConfig = { ...this.mockConfig, ...config };
  }
}
