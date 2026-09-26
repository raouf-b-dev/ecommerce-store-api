// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

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
