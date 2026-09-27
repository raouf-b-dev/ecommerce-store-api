import { LoggerService, Logger } from '@nestjs/common';

export class MockLogger extends Logger implements LoggerService {
  constructor() {
    super();
  }

  log = jest.fn() as any;
  error = jest.fn() as any;
  warn = jest.fn() as any;
  debug = jest.fn() as any;
  verbose = jest.fn() as any;
  fatal = jest.fn() as any;
  setLogLevels = jest.fn() as any;
}
