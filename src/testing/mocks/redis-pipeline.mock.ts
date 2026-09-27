export class MockRedisPipeline {
  json = {
    set: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    merge: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
  };

  expire = jest.fn().mockReturnThis();
  del = jest.fn().mockReturnThis();
  exec = jest.fn().mockResolvedValue([]);
}
