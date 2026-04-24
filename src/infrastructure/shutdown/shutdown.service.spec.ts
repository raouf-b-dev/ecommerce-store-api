import { Test, TestingModule } from '@nestjs/testing';
import { ShutdownService } from './shutdown.service';
import { Logger } from '@nestjs/common';

describe('ShutdownService', () => {
  let service: ShutdownService;

  beforeEach(async () => {
    // Mock process.exit to prevent the test suite from exiting
    jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
      return undefined as never;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShutdownService],
    }).compile();

    service = module.get<ShutdownService>(ShutdownService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('beforeApplicationShutdown', () => {
    it('should start the safety timeout on the first call', () => {
      jest.useFakeTimers();
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation();

      service.beforeApplicationShutdown('SIGTERM');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Received SIGTERM. Starting graceful shutdown...',
      );

      // Should set timeout
      expect((service as any).shutdownTimeout).not.toBeNull();

      // Fast forward to trigger the timeout
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      jest.advanceTimersByTime(15000);

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
  });

  describe('onApplicationShutdown', () => {
    it('should clear the safety timeout if it exists', () => {
      jest.useFakeTimers();

      // Setup timeout
      service.beforeApplicationShutdown('SIGTERM');
      expect((service as any).shutdownTimeout).not.toBeNull();

      // Call onApplicationShutdown
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation();
      service.onApplicationShutdown();

      expect((service as any).shutdownTimeout).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Graceful shutdown completed successfully.',
      );
    });
  });
});
