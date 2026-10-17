import {
  buildIoRedisConnection,
  buildNodeRedisClientOptions,
} from './redis-connection.options';
import type { RedisConfig } from './redis-connection.options';

const baseRedis: RedisConfig = {
  host: 'redis.example.com',
  port: 6380,
  password: 's3cret!',
  key_prefix: 'ecom:test:',
  db: 2,
  tls: false,
};

describe('buildNodeRedisClientOptions', () => {
  it('uses discrete host/port without TLS by default', () => {
    expect(buildNodeRedisClientOptions(baseRedis)).toEqual({
      password: 's3cret!',
      database: 2,
      socket: {
        host: 'redis.example.com',
        port: 6380,
        reconnectStrategy: expect.any(Function),
      },
    });
  });

  it('enables socket TLS when redis.tls is true', () => {
    const options = buildNodeRedisClientOptions({ ...baseRedis, tls: true });
    expect(options.socket).toMatchObject({
      host: 'redis.example.com',
      port: 6380,
      tls: true,
    });
  });
});

describe('buildIoRedisConnection', () => {
  it('omits tls when disabled', () => {
    expect(buildIoRedisConnection(baseRedis)).toEqual({
      host: 'redis.example.com',
      port: 6380,
      password: 's3cret!',
      db: 2,
    });
  });

  it('adds empty tls object when enabled', () => {
    expect(buildIoRedisConnection({ ...baseRedis, tls: true })).toEqual({
      host: 'redis.example.com',
      port: 6380,
      password: 's3cret!',
      db: 2,
      tls: {},
    });
  });
});
