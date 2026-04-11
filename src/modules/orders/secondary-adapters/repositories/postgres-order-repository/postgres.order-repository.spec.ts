import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity } from '../../orm/order.schema';
import { PostgresOrderRepository } from './postgres.order-repository';
import { OrderStatus } from '../../../core/domain/value-objects/order-status';
import {
  TestDataHelper,
  createMockRepository,
  ResultAssertionHelper,
} from '../../../../../testing';
import { OrderMapper } from '../../persistence/mappers/order.mapper';

describe('PostgresOrderRepository', () => {
  let repository: PostgresOrderRepository;
  let mockOrmRepo: jest.Mocked<Repository<OrderEntity>>;

  const testData = TestDataHelper.createRepositoryTestData({ useCOD: true });

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
      if (result.isSuccess) {
        expect(result.value.id).toBe(testData.orderId);
      }
      expect(mockOrmRepo.save).toHaveBeenCalled();
    });

    it('should return error on DB failure', async () => {
      mockOrmRepo.save.mockRejectedValue(new Error('DB Error'));

      const order = OrderMapper.toDomain(testData.orderEntity);
      const result = await repository.save(order);

      ResultAssertionHelper.assertResultFailure(result, 'Failed to save order');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      mockOrmRepo.findOne.mockResolvedValue(testData.orderEntity);
      mockOrmRepo.save.mockResolvedValue({
        ...testData.orderEntity,
        status: OrderStatus.CANCELLED,
      });

      const order = OrderMapper.toDomain(testData.orderEntity);
      order.cancel();
      const result = await repository.cancelOrder(order);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELLED }),
      );
    });
  });

  describe('updateItemsInfo', () => {
    it('should update order items successfully', async () => {
      mockOrmRepo.findOne.mockResolvedValue(testData.orderEntity);
      mockOrmRepo.find.mockResolvedValue([]);
      mockOrmRepo.save.mockResolvedValue(testData.orderEntity);

      const updateDto = [
        {
          productId: testData.productId,
          quantity: 3,
          productName: 'Test',
          unitPrice: 100,
        },
      ];

      const result = await repository.updateItemsInfo(
        testData.orderId,
        updateDto,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.save).toHaveBeenCalled();
    });

    it('should fail if order not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.updateItemsInfo(999, []);

      ResultAssertionHelper.assertResultFailure(result, 'ORDER_NOT_FOUND');
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
