import { Test, TestingModule } from '@nestjs/testing';
import { ShutdownService } from './shutdown.service';
import { Logger } from '@nestjs/common';
import { vi } from 'vitest';

describe('ShutdownService', () => {
  let service: ShutdownService;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Mock process.exit to prevent the test suite from exiting
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((_code?: string | number | null) => {
        return undefined as never;
      });

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShutdownService],
    }).compile();

    service = module.get<ShutdownService>(ShutdownService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('beforeApplicationShutdown', () => {
    it('should start the safety timeout on the first call', () => {
      vi.useFakeTimers();
      const loggerSpy = vi
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);

      service.beforeApplicationShutdown('SIGTERM');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Received SIGTERM. Starting graceful shutdown...',
      );

      // Should set timeout
      expect(service['shutdownTimeout']).not.toBeNull();

      // Fast forward to trigger the timeout
      const errorSpy = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      vi.advanceTimersByTime(15000);

      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should ignore subsequent calls if already shutting down', () => {
      jest.useFakeTimers();
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation();

      service.beforeApplicationShutdown('SIGTERM');
      service.beforeApplicationShutdown('SIGINT');

      expect(loggerSpy).toHaveBeenCalledTimes(1);
    });

    it('should expose isShuttingDown via public getter', () => {
      jest.useFakeTimers();
      expect(service.isShuttingDown).toBe(false);

      service.beforeApplicationShutdown('SIGTERM');

      expect(service.isShuttingDown).toBe(true);
      service.onApplicationShutdown();
    });
  });

  describe('onApplicationShutdown', () => {
    it('should clear the safety timeout if it exists', () => {
      jest.useFakeTimers();

      // Setup timeout
      service.beforeApplicationShutdown('SIGTERM');
      expect(service['shutdownTimeout']).not.toBeNull();

      // Call onApplicationShutdown
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation();
      service.onApplicationShutdown();

      expect(service['shutdownTimeout']).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Graceful shutdown completed successfully.',
      );
    });
  });
});
