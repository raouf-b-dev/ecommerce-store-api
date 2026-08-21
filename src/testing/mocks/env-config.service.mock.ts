import { EnvConfigService } from '../../config/env-config.service';
import { IAppConfig, AppConfigKey } from '../../config/configuration';
import { Injectable } from '@nestjs/common';

function createDefaultMockConfig(): IAppConfig {
  return {
    jwt: {
      refreshTokenTtl: '7d',
      accessTokenTtl: '1h',
      privateKey: 'test-private-key',
      cartSessionTtl: '7d',
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
    http: {
      trustProxy: 'false',
    },
    metricsApiKey: 'test-key',
    otel: {
      tracingEnabled: false,
      exporterEndpoint: 'http://localhost:4317',
    },
  };
}

@Injectable()
export class MockEnvConfigService extends EnvConfigService {
  private readonly configState: IAppConfig;

  constructor() {
    const configState = createDefaultMockConfig();
    super({
      get: (key) => configState[key],
    });
    this.configState = configState;
  }

  override get<T extends AppConfigKey>(key: T): IAppConfig[T] {
    const value = this.configState[key];
    if (value === undefined || value === null) {
      throw new Error(`${key} is not defined in mock config`);
    }
    return value;
  }

  override get jwt() {
    return this.configState.jwt;
  }

  override get node() {
    return this.configState.node;
  }

  override get redis() {
    return this.configState.redis;
  }

  override get postgres() {
    return this.configState.postgres;
  }

  override get logLevel() {
    return this.configState.logging.level;
  }

  override get logDir() {
    return this.configState.logging.dir;
  }

  override get logTransport() {
    return this.configState.logging.transport;
  }

  override get cors() {
    return this.configState.cors;
  }

  override get throttle() {
    return this.configState.throttle;
  }

  override get http() {
    return this.configState.http;
  }

  override get metricsApiKey() {
    return this.configState.metricsApiKey;
  }

  override get otel() {
    return this.configState.otel;
  }

  setMockConfig(config: Partial<IAppConfig>) {
    Object.assign(this.configState, config);
  }
}
