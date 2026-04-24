import {
  Injectable,
  Logger,
  BeforeApplicationShutdown,
  OnApplicationShutdown,
} from '@nestjs/common';

@Injectable()
export class ShutdownService
  implements BeforeApplicationShutdown, OnApplicationShutdown
{
  private readonly logger = new Logger(ShutdownService.name);
  private readonly GRACEFUL_SHUTDOWN_TIMEOUT = 15000;
  private isShuttingDown = false;
  private shutdownTimeout: NodeJS.Timeout | null = null;

  beforeApplicationShutdown(signal?: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.logger.log(`Received ${signal}. Starting graceful shutdown...`);

    // Start a safety timeout to force exit if NestJS shutdown stalls
    this.shutdownTimeout = setTimeout(() => {
      this.logger.error(
        `Graceful shutdown took longer than ${this.GRACEFUL_SHUTDOWN_TIMEOUT}ms. Forcing process exit.`,
      );
      process.exit(1);
    }, this.GRACEFUL_SHUTDOWN_TIMEOUT);

    // Don't keep the process alive just for this timeout
    if (this.shutdownTimeout.unref) {
      this.shutdownTimeout.unref();
    }
  }

  onApplicationShutdown() {
    // If we reach here, NestJS finished closing all providers correctly
    if (this.shutdownTimeout) {
      clearTimeout(this.shutdownTimeout);
      this.shutdownTimeout = null;
    }
    this.logger.log('Graceful shutdown completed successfully.');
  }
}
