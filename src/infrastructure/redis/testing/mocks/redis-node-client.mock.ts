/**
 * Low-level node-redis client mock used when unit-testing {@link RedisService}.
 */
export class MockRedisFtClient {
  info = jest.fn().mockResolvedValue({});
  create = jest.fn().mockResolvedValue('OK');
  search = jest.fn().mockResolvedValue({ total: 0, documents: [] });
  dropIndex = jest.fn().mockResolvedValue('OK');

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

  mockDropMissing(message = 'Unknown Index name'): void {
    this.dropIndex.mockRejectedValue(new Error(message));
  }

  reset(): void {
    jest.clearAllMocks();
    this.mockIndexExists();
    this.mockCreateSuccess();
    this.dropIndex.mockResolvedValue('OK');
    this.search.mockResolvedValue({ total: 0, documents: [] });
  }
}

export class MockRedisNodeClient {
  connect = jest.fn().mockResolvedValue(undefined);
  quit = jest.fn().mockResolvedValue(undefined);
  on = jest.fn();
  isReady = true;
  incr = jest.fn().mockResolvedValue(1);
  json = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    merge: jest.fn().mockResolvedValue('OK'),
    del: jest.fn(),
    mGet: jest.fn(),
  };
  multi = jest.fn().mockReturnValue({
    json: {
      set: jest.fn().mockReturnThis(),
      merge: jest.fn().mockReturnThis(),
    },
    expire: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(['OK', 1]),
  });
  scan = jest.fn();
  del = jest.fn();
  ttl = jest.fn();
  expire = jest.fn();
  exists = jest.fn();
  ft = new MockRedisFtClient();

  mockConnectFailure(error: Error = new Error('ECONNREFUSED')): void {
    this.connect.mockRejectedValue(error);
  }

  reset(): void {
    jest.clearAllMocks();
    this.isReady = true;
    this.connect.mockResolvedValue(undefined);
    this.quit.mockResolvedValue(undefined);
    this.incr.mockResolvedValue(1);
    this.ft.reset();
  }
}
