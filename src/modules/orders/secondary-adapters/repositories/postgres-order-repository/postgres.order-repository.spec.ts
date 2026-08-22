import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpStatus } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity } from '../../orm/order.schema';
import { PostgresOrderRepository } from './postgres.order-repository';
import {
  TestDataHelper,
  createMockRepository,
  ResultAssertionHelper,
} from '../../../../../testing';
import { OrderMapper } from '../../persistence/mappers/order.mapper';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import {
  createMockDataSource,
  createMockQueryBuilder,
  createMockTransactionManager,
} from '../../../../../testing/mocks/typeorm.mocks';

describe('PostgresOrderRepository', () => {
  let repository: PostgresOrderRepository;
  let mockOrmRepo: jest.Mocked<Repository<OrderEntity>>;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder<OrderEntity>>;
  let mockTransactionManager: ReturnType<typeof createMockTransactionManager>;

  const testData = TestDataHelper.createRepositoryTestData();

  beforeEach(async () => {
    mockOrmRepo = createMockRepository<OrderEntity>();
    mockQueryBuilder = createMockQueryBuilder<OrderEntity>();
    mockTransactionManager = createMockTransactionManager({
      mockQueryBuilder,
    });
    const mockDataSource = createMockDataSource(mockTransactionManager);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresOrderRepository,
        { provide: getRepositoryToken(OrderEntity), useValue: mockOrmRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    repository = module.get<PostgresOrderRepository>(PostgresOrderRepository);
  });

  describe('save', () => {
    it('should save order successfully', async () => {
      mockOrmRepo.save.mockResolvedValue(testData.orderEntity);

      const order = OrderMapper.toDomain(testData.orderEntity);
      const result = await repository.save(order);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.save).toHaveBeenCalled();
    });

    it('should OCC-update with WHERE version when expectedVersion is provided', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 1 });
      mockOrmRepo.findOne.mockResolvedValue(testData.orderEntity);
      const order = OrderMapper.toDomain(testData.orderEntity);

      const result = await repository.save(order, 1);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.save).not.toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(OrderEntity);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'id = :id AND version = :expectedVersion',
        { id: order.id, expectedVersion: 1 },
      );
    });

    it('should return conflict when OCC update affects 0 rows and the order exists', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 0 });
      mockTransactionManager.findOne.mockResolvedValue(testData.orderEntity);
      const order = OrderMapper.toDomain(testData.orderEntity);

      const result = await repository.save(order, 1);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Optimistic lock failure',
        RepositoryError,
      );
      if (result.isFailure) {
        expect(result.error.statusCode).toBe(HttpStatus.CONFLICT);
      }
    });

    it('should return error on DB failure', async () => {
      mockOrmRepo.save.mockRejectedValue(new Error('DB Error'));

      const order = OrderMapper.toDomain(testData.orderEntity);
      const result = await repository.save(order);

      ResultAssertionHelper.assertResultFailure(result, 'Failed to save order');
    });
  });

  describe('findByIdForUpdate', () => {
    it('should return order and version for update', async () => {
      mockOrmRepo.findOne.mockResolvedValue(testData.orderEntity);

      const result = await repository.findByIdForUpdate(testData.orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.entity.id).toBe(testData.orderId);
        expect(result.value.expectedVersion).toBe(testData.orderEntity.version);
      }
    });
  });

  describe('listOrders', () => {
    it('should list orders successfully', async () => {
      (mockOrmRepo.createQueryBuilder().getMany as jest.Mock).mockResolvedValue(
        [testData.orderEntity],
      );

      const result = await repository.listOrders({});

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.length).toBe(1);
      }
    });
  });
});
