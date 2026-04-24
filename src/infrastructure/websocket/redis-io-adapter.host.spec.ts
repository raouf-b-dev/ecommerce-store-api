import { Test, TestingModule } from '@nestjs/testing';
import { RedisIoAdapterHost } from './redis-io-adapter.host';
import { RedisIoAdapter } from './adapters/redis-io.adapter';
import { Logger } from '@nestjs/common';

describe('RedisIoAdapterHost', () => {
  let host: RedisIoAdapterHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisIoAdapterHost],
    }).compile();

    host = module.get<RedisIoAdapterHost>(RedisIoAdapterHost);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(host).toBeDefined();
  });

  describe('beforeApplicationShutdown', () => {
    it('should close the adapter if it is set', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation();
      const mockAdapter = {
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as RedisIoAdapter;

      host.setAdapter(mockAdapter);
      await host.beforeApplicationShutdown();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Closing RedisIoAdapter pub/sub connections...',
      );
      expect(mockAdapter.close).toHaveBeenCalled();
    });

    it('should do nothing if the adapter is not set', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation();

      await host.beforeApplicationShutdown();

      expect(loggerSpy).not.toHaveBeenCalled();
    });
  });
});
