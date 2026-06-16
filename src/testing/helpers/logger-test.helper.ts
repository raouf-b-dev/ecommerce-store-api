import { Logger } from '@nestjs/common';

export class LoggerTestHelper {
  /**
   * Silences all NestJS Logger methods to prevent console pollution during tests.
   * Recommended to call in beforeEach() of unit tests that trigger expected warnings/errors.
   */
  static silence(): void {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => undefined);
  }
}
