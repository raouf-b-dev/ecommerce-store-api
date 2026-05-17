import { Reflector } from '@nestjs/core';

export class MockReflector extends Reflector {
  constructor() {
    super();
    this.getAllAndOverride = jest.fn();
    this.get = jest.fn();
    this.getAll = jest.fn();
    this.getAllAndMerge = jest.fn();
  }

  override getAllAndOverride: jest.Mock;
  override get: jest.Mock;
  override getAll: jest.Mock;
  override getAllAndMerge: jest.Mock;
}
