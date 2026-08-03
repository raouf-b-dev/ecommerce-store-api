import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity } from '../../orm/order.schema';
import { PostgresOrderRepository } from './postgres.order-repository';
import {
  TestDataHelper,
  createMockRepository,
  ResultAssertionHelper,
} from '../../../../../testing';
import { OrderMapper } from '../../persistence/mappers/order.mapper';

describe('PostgresOrderRepository', () => {
  let repository: PostgresOrderRepository;
  let mockOrmRepo: jest.Mocked<Repository<OrderEntity>>;

  const testData = TestDataHelper.createRepositoryTestData();

  beforeEach(async () => {
    mockOrmRepo = createMockRepository<OrderEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresOrderRepository,
        { provide: getRepositoryToken(OrderEntity), useValue: mockOrmRepo },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn((cb) => cb(mockOrmRepo)) },
        },
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
