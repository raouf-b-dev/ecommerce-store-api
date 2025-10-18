// src/testing/mocks/typeorm.mocks.ts
import {
  SelectQueryBuilder,
  DeleteResult,
  UpdateResult,
  ObjectLiteral,
} from 'typeorm';

/**
 * Creates a mock TypeORM query builder with all common methods
 */
export function createMockQueryBuilder<T extends ObjectLiteral>(): jest.Mocked<
  SelectQueryBuilder<T>
> {
  const mockQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
    execute: jest.fn().mockResolvedValue({ raw: [], affected: 1 }),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(), // Added from method for delete/update queries
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<SelectQueryBuilder<T>>;

  return mockQb;
}

/**
 * Creates a mock TypeORM transaction manager
 */
export function createMockTransactionManager(options?: {
  mockProduct?: any;
  mockOrder?: any;
  mockQueryBuilder?: jest.Mocked<SelectQueryBuilder<any>>;
}) {
  const defaultQueryBuilder =
    options?.mockQueryBuilder || createMockQueryBuilder();

  return {
    find: jest
      .fn()
      .mockResolvedValue(options?.mockProduct ? [options.mockProduct] : []),
    findOne: jest.fn().mockResolvedValue(options?.mockOrder || null),
    findOneBy: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(options?.mockOrder || {}),
    remove: jest.fn().mockResolvedValue({}),
    delete: jest
      .fn()
      .mockResolvedValue({ raw: [], affected: 1 } as DeleteResult),
    update: jest
      .fn()
      .mockResolvedValue({ raw: [], affected: 1 } as UpdateResult),
    exists: jest.fn().mockResolvedValue(true),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue(defaultQueryBuilder),
    query: jest.fn().mockResolvedValue([]),
    transaction: jest.fn().mockImplementation((cb) => cb(this)),
  };
}

/**
 * Creates a mock DataSource
 */
export function createMockDataSource(mockManager?: any) {
  const manager = mockManager || createMockTransactionManager();

  return {
    transaction: jest.fn().mockImplementation((cb) => cb(manager)),
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager,
    }),
    getRepository: jest.fn().mockReturnValue(manager),
    manager,
  };
}
