/**
 * Low-level node-redis client mock used when unit-testing {@link RedisService}.
 */
export class MockRedisFtClient {
  info = jest.fn().mockResolvedValue({});
  create = jest.fn().mockResolvedValue('OK');
  search = jest.fn().mockResolvedValue({ total: 0, documents: [] });

  mockIndexExists(): void {
    this.info.mockResolvedValue({});
  }

  mockIndexMissing(message = 'Unknown Index name'): void {
    this.info.mockRejectedValue(new Error(message));
  }

  mockCreateSuccess(): void {
    this.create.mockResolvedValue('OK');
  }

  mockCreateAlreadyExists(): void {
    this.create.mockRejectedValue(new Error('Index already exists'));
  }

  reset(): void {
    jest.clearAllMocks();
    this.mockIndexExists();
    this.mockCreateSuccess();
    this.search.mockResolvedValue({ total: 0, documents: [] });
  }
}

export class MockRedisNodeClient {
  connect = jest.fn().mockResolvedValue(undefined);
  quit = jest.fn().mockResolvedValue(undefined);
  on = jest.fn();
  isReady = true;
  json = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };
  multi = jest.fn();
  scan = jest.fn();
  del = jest.fn();
  ft = new MockRedisFtClient();

  mockConnectFailure(error: Error = new Error('ECONNREFUSED')): void {
    this.connect.mockRejectedValue(error);
  }

  reset(): void {
    jest.clearAllMocks();
    this.isReady = true;
    this.connect.mockResolvedValue(undefined);
    this.quit.mockResolvedValue(undefined);
    this.ft.reset();
  }
}
