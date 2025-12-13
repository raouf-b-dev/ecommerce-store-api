// src/order/infrastructure/postgres-order.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrderEntity } from '../../orm/order.schema';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { PostgresOrderRepository } from './postgres.order-repository';
import { Order } from '../../../domain/entities/order';
import { CreateOrderItemDto } from '../../../presentation/dto/create-order-item.dto';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import {
  TestDataHelper,
  createMockIdGenerator,
  createMockQueryBuilder,
  createMockTransactionManager,
  createMockDataSource,
  ResultAssertionHelper,
} from '../../../../../testing';
import { ProductEntityTestFactory } from '../../../../products/testing';
import {
  CreateOrderDtoTestFactory,
  OrderEntityTestFactory,
} from '../../../testing';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { OrderMapper } from '../../persistence/mappers/order.mapper';

describe('PostgresOrderRepository', () => {
  let repository: PostgresOrderRepository;
  let mockOrmRepo: jest.Mocked<Repository<OrderEntity>>;

  const testData = TestDataHelper.createRepositoryTestData({ useCOD: true });
  const mockIdGen = createMockIdGenerator({
    orderId: testData.orderId,
    customerId: testData.customerId,
    paymentId: testData.paymentId,
    shippingAddressId: testData.shippingAddressId,
  });

  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  let mockManager: ReturnType<typeof createMockTransactionManager>;
  let mockDataSource: ReturnType<typeof createMockDataSource>;

  beforeEach(async () => {
    // Setup mock query builder
    mockQueryBuilder = createMockQueryBuilder();
    mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 1 });

    // Setup mock manager
    mockManager = createMockTransactionManager({
      mockProduct: testData.productEntity,
      mockOrder: testData.orderEntity,
      mockQueryBuilder,
    });

    // Setup mock data source
    mockDataSource = createMockDataSource(mockManager);

    // Setup mock ORM repository
    mockOrmRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresOrderRepository,
        { provide: getRepositoryToken(OrderEntity), useValue: mockOrmRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: IdGeneratorService, useValue: mockIdGen },
      ],
    }).compile();

    repository = module.get<PostgresOrderRepository>(PostgresOrderRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('listOrders', () => {
    it('should list orders successfully with default params', async () => {
      const orders = [testData.orderEntity];
      mockQueryBuilder.getMany.mockResolvedValue(orders);

      const result = await repository.listOrders({});

      const domainOrders = OrderMapper.toDomainArray(orders);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(domainOrders);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'order.createdAt',
        'DESC',
      );
    });

    it('should list orders with filters', async () => {
      const orders = [testData.orderEntity];
      mockQueryBuilder.getMany.mockResolvedValue(orders);

      const dto: ListOrdersQueryDto = {
        page: 2,
        limit: 5,
        customerId: testData.customerId,
        status: OrderStatus.PENDING,
        sortBy: 'totalPrice',
        sortOrder: 'asc',
      };

      const result = await repository.listOrders(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.customerId = :customerId',
        { customerId: testData.customerId },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should return error on failure', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('DB Error'));

      const result = await repository.listOrders({});

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to list orders',
      );
    });
  });

  describe('save', () => {
    it('should save order successfully', async () => {
      mockManager.find.mockResolvedValue([testData.productEntity]);
      mockManager.save.mockResolvedValue(testData.orderEntity);

      const order = OrderMapper.toDomain(testData.orderEntity);
      const result = await repository.save(order);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.id).toBe(testData.orderId);
        expect(result.value.customerId).toBe(testData.customerId);
      }
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should fail if product not found', async () => {
      mockManager.find.mockResolvedValue([]);

      const order = OrderMapper.toDomain(testData.orderEntity);
      const result = await repository.save(order);

      ResultAssertionHelper.assertResultFailure(result, 'PRODUCT_NOT_FOUND');
    });

    it('should return error on DB failure', async () => {
      mockManager.find.mockRejectedValue(new Error('DB Error'));

      const order = OrderMapper.toDomain(testData.orderEntity);
      const result = await repository.save(order);

      ResultAssertionHelper.assertResultFailure(result, 'Failed to save order');
    });

    it('should save order with multiple items', async () => {
      const multiItemData = TestDataHelper.createMultiItemTestData(3);

      mockManager.find.mockResolvedValue(multiItemData.productEntities);
      mockManager.save.mockResolvedValue(multiItemData.orderEntity);

      const order = OrderMapper.toDomain(multiItemData.orderEntity);
      const result = await repository.save(order);

      ResultAssertionHelper.assertResultSuccess(result);
    });
  });

  describe('updateStatus', () => {
    it('should update order status successfully', async () => {
      mockOrmRepo.update.mockResolvedValue({
        raw: [],
        affected: 1,
        generatedMaps: [],
      });

      const result = await repository.updateStatus(
        testData.orderId,
        OrderStatus.CONFIRMED,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.update).toHaveBeenCalledWith(testData.orderId, {
        status: OrderStatus.CONFIRMED,
        updatedAt: expect.any(Date),
      });
    });

    it('should return error if order not found during status update', async () => {
      mockOrmRepo.update.mockResolvedValue({
        raw: [],
        affected: 0,
        generatedMaps: [],
      });

      const result = await repository.updateStatus(
        testData.orderId,
        OrderStatus.CONFIRMED,
      );

      ResultAssertionHelper.assertResultFailure(result, 'Order not found');
    });

    it('should return error on DB failure during status update', async () => {
      mockOrmRepo.update.mockRejectedValue(new Error('DB Error'));

      const result = await repository.updateStatus(
        testData.orderId,
        OrderStatus.CONFIRMED,
      );

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update order status',
      );
    });

    it('should update status from PENDING to CONFIRMED', async () => {
      mockOrmRepo.update.mockResolvedValue({
        raw: [],
        affected: 1,
        generatedMaps: [],
      });

      const result = await repository.updateStatus(
        testData.orderId,
        OrderStatus.CONFIRMED,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.update).toHaveBeenCalledWith(
        testData.orderId,
        expect.objectContaining({ status: OrderStatus.CONFIRMED }),
      );
    });

    it('should update status from CONFIRMED to PROCESSING', async () => {
      mockOrmRepo.update.mockResolvedValue({
        raw: [],
        affected: 1,
        generatedMaps: [],
      });

      const result = await repository.updateStatus(
        testData.orderId,
        OrderStatus.PROCESSING,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.update).toHaveBeenCalledWith(
        testData.orderId,
        expect.objectContaining({ status: OrderStatus.PROCESSING }),
      );
    });

    it('should update status from PROCESSING to SHIPPED', async () => {
      mockOrmRepo.update.mockResolvedValue({
        raw: [],
        affected: 1,
        generatedMaps: [],
      });

      const result = await repository.updateStatus(
        testData.orderId,
        OrderStatus.SHIPPED,
      );

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should update status from SHIPPED to DELIVERED', async () => {
      mockOrmRepo.update.mockResolvedValue({
        raw: [],
        affected: 1,
        generatedMaps: [],
      });

      const result = await repository.updateStatus(
        testData.orderId,
        OrderStatus.DELIVERED,
      );

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should always update updatedAt timestamp', async () => {
      const beforeUpdate = new Date();
      mockOrmRepo.update.mockResolvedValue({
        raw: [],
        affected: 1,
        generatedMaps: [],
      });

      await repository.updateStatus(testData.orderId, OrderStatus.CONFIRMED);

      expect(mockOrmRepo.update).toHaveBeenCalledWith(
        testData.orderId,
        expect.objectContaining({
          updatedAt: expect.any(Date),
        }),
      );

      const callArgs = mockOrmRepo.update.mock.calls[0][1] as any;
      expect(callArgs.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });
  });

  describe('updateItemsInfo', () => {
    it('should update order items successfully', async () => {
      const updateDto: CreateOrderItemDto[] = [
        { productId: testData.productId, quantity: 3 },
      ];

      mockManager.findOne.mockResolvedValue(testData.orderEntity);
      mockManager.find.mockResolvedValue([testData.productEntity]);
      mockManager.save.mockResolvedValue(testData.orderEntity);

      const result = await repository.updateItemsInfo(
        testData.orderId,
        updateDto,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value).toEqual(
          OrderMapper.toDomain(testData.orderEntity),
        );
      }
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should fail if order not found', async () => {
      mockManager.findOne.mockResolvedValue(null);

      const result = await repository.updateItemsInfo(testData.orderId, []);

      ResultAssertionHelper.assertResultFailure(result, 'ORDER_NOT_FOUND');
    });

    it('should fail if product not found during update', async () => {
      mockManager.findOne.mockResolvedValue(testData.orderEntity);
      mockManager.find.mockResolvedValue([]);

      const updateDto: CreateOrderItemDto[] = [
        { productId: 'PR999', quantity: 1 },
      ];

      const result = await repository.updateItemsInfo(
        testData.orderId,
        updateDto,
      );

      ResultAssertionHelper.assertResultFailure(result, 'PRODUCT_NOT_FOUND');
    });

    it('should fail on insufficient stock during update', async () => {
      const updateDto: CreateOrderItemDto[] = [
        { productId: testData.productId, quantity: 20 },
      ];

      mockManager.findOne.mockResolvedValue(testData.orderEntity);
      mockManager.find.mockResolvedValue([testData.productEntity]);
      mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 0 });
      mockManager.exists.mockResolvedValue(true);

      const result = await repository.updateItemsInfo(
        testData.orderId,
        updateDto,
      );

      ResultAssertionHelper.assertResultFailure(result, 'INSUFFICIENT_STOCK');
    });

    it('should return error on DB failure', async () => {
      mockManager.findOne.mockRejectedValue(new Error('DB Error'));

      const result = await repository.updateItemsInfo(testData.orderId, []);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update order',
      );
    });
  });

  describe('findById', () => {
    it('should find order by id successfully', async () => {
      mockOrmRepo.findOne.mockResolvedValue(testData.orderEntity);

      const result = await repository.findById(testData.orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value).toBeInstanceOf(Order);
        expect(result.value.id).toBe(testData.orderId);
      }
    });

    it('should return error if order not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(testData.orderId);

      ResultAssertionHelper.assertResultFailure(result, 'Order not found');
    });

    it('should return error on DB failure', async () => {
      mockOrmRepo.findOne.mockRejectedValue(new Error('DB Error'));

      const result = await repository.findById(testData.orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find the order',
      );
    });

    it('should find orders with different statuses', async () => {
      const statuses = [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ];

      for (const status of statuses) {
        const orderEntity =
          OrderEntityTestFactory.createOrderEntityWithStatus(status);
        mockOrmRepo.findOne.mockResolvedValue(orderEntity);

        const result = await repository.findById(orderEntity.id);

        ResultAssertionHelper.assertResultSuccess(result);
        if (result.isSuccess) {
          expect(result.value.status).toBe(status);
        }
      }
    });
  });

  describe('deleteById', () => {
    it('should delete order by id successfully', async () => {
      mockOrmRepo.delete.mockResolvedValue({ raw: [], affected: 1 });

      const result = await repository.deleteById(testData.orderId);

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return error if order not found', async () => {
      mockOrmRepo.delete.mockResolvedValue({ raw: [], affected: 0 });

      const result = await repository.deleteById(testData.orderId);

      ResultAssertionHelper.assertResultFailure(result, 'Order not found');
    });

    it('should return error on DB failure', async () => {
      mockOrmRepo.delete.mockRejectedValue(new Error('DB Error'));

      const result = await repository.deleteById(testData.orderId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to delete the order',
      );
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order and restore stock for each item (success)', async () => {
      const orderToCancel = OrderTestFactory.createCancellableOrder({
        id: testData.orderId,
      });
      const cancelledOrder = Order.fromPrimitives(orderToCancel);
      cancelledOrder.cancel();

      const cancelledEntity = OrderEntityTestFactory.createCancelledOrderEntity(
        {
          id: testData.orderId,
        },
      );

      mockManager.save.mockResolvedValue(cancelledEntity);

      const result = await repository.cancelOrder(cancelledOrder);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should return error on DB failure (save fails)', async () => {
      const orderToCancel = OrderTestFactory.createCancellableOrder({
        id: testData.orderId,
      });
      const cancelledOrder = Order.fromPrimitives(orderToCancel);
      cancelledOrder.cancel();

      mockManager.save.mockRejectedValue(new Error('DB Error'));

      const result = await repository.cancelOrder(cancelledOrder);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to cancel order',
      );
    });

    it('should return error when updating product stock fails', async () => {
      const orderToCancel = OrderTestFactory.createCancellableOrder({
        id: testData.orderId,
      });
      const cancelledOrder = Order.fromPrimitives(orderToCancel);
      cancelledOrder.cancel();

      mockQueryBuilder.execute.mockRejectedValue(
        new Error('DB Error during stock restore'),
      );

      const result = await repository.cancelOrder(cancelledOrder);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to cancel order',
      );
    });

    it('should restore stock for multiple items when order has many items', async () => {
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(3);
      const cancelledOrder = Order.fromPrimitives(multiItemOrder);
      cancelledOrder.cancel();

      mockManager.createQueryBuilder.mockClear();
      mockQueryBuilder.update.mockClear();
      mockQueryBuilder.where.mockClear();
      mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 1 });

      const cancelledEntity = OrderEntityTestFactory.createCancelledOrderEntity(
        {
          id: multiItemOrder.id,
        },
      );
      mockManager.save.mockResolvedValue(cancelledEntity);

      const result = await repository.cancelOrder(cancelledOrder);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockManager.createQueryBuilder).toHaveBeenCalledTimes(3);
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should cancel COD order successfully', async () => {
      const codOrder = OrderTestFactory.createCashOnDeliveryOrder({
        id: testData.orderId,
      });
      const cancelledOrder = Order.fromPrimitives(codOrder);
      cancelledOrder.cancel();

      const cancelledEntity = OrderEntityTestFactory.createCancelledOrderEntity(
        {
          id: testData.orderId,
        },
      );
      mockManager.save.mockResolvedValue(cancelledEntity);

      const result = await repository.cancelOrder(cancelledOrder);

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should cancel order at different stages', async () => {
      const cancellableStatuses = [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
      ];

      for (const status of cancellableStatuses) {
        const order = OrderTestFactory.createMockOrder({
          id: `OR${status}`,
          status,
        });
        const cancelledOrder = Order.fromPrimitives(order);
        cancelledOrder.cancel();

        const cancelledEntity =
          OrderEntityTestFactory.createCancelledOrderEntity({
            id: order.id,
          });
        mockManager.save.mockResolvedValue(cancelledEntity);

        const result = await repository.cancelOrder(cancelledOrder);

        ResultAssertionHelper.assertResultSuccess(result);
        expect(result.value).toBe(undefined);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle orders with special characters in notes', async () => {
      const orderWithSpecialNotes = OrderEntityTestFactory.createOrderEntity({
        customerNotes: 'Special chars: <>&"\'',
      });

      mockManager.save.mockResolvedValue(orderWithSpecialNotes);

      const order = OrderMapper.toDomain(orderWithSpecialNotes);
      const result = await repository.save(order);

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should handle orders with maximum allowed items', async () => {
      const maxItems = TestDataHelper.createMultiItemTestData(10);

      mockManager.find.mockResolvedValue(maxItems.productEntities);
      mockManager.save.mockResolvedValue(maxItems.orderEntity);

      const order = OrderMapper.toDomain(maxItems.orderEntity);
      const result = await repository.save(order);

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should handle orders with minimum values', async () => {
      const minOrder = OrderEntityTestFactory.createOrderEntity({
        subtotal: 0.01,
        shippingCost: 0,
        totalPrice: 0.01,
        items: [
          OrderEntityTestFactory.createOrderItemEntity({
            quantity: 1,
            unitPrice: 0.01,
            lineTotal: 0.01,
          }),
        ],
      });

      mockManager.save.mockResolvedValue(minOrder);

      const order = OrderMapper.toDomain(minOrder);
      const result = await repository.save(order);

      ResultAssertionHelper.assertResultSuccess(result);
    });
  });

  describe('Transaction Handling', () => {
    it('should rollback on save failure after stock update', async () => {
      mockManager.find.mockResolvedValue([testData.productEntity]);
      mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 1 });
      mockManager.save.mockRejectedValue(new Error('Save failed'));

      const order = OrderMapper.toDomain(testData.orderEntity);
      const result = await repository.save(order);

      ResultAssertionHelper.assertResultFailure(result, 'Failed to save order');
    });

    it('should handle transaction isolation correctly', async () => {
      expect(mockDataSource.transaction).toBeDefined();

      const order = OrderMapper.toDomain(testData.orderEntity);
      await repository.save(order);

      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('Performance & Optimization', () => {
    it('should batch product lookups efficiently', async () => {
      const multiItemData = TestDataHelper.createMultiItemTestData(5);

      mockManager.find.mockResolvedValue(multiItemData.productEntities);
      mockManager.save.mockResolvedValue(multiItemData.orderEntity);

      const order = OrderMapper.toDomain(multiItemData.orderEntity);
      await repository.save(order);

      expect(mockManager.find).toHaveBeenCalledTimes(1);
    });

    it('should handle duplicate product IDs in order items', async () => {
      const products = ProductEntityTestFactory.createProductEntities([
        'PR1',
        'PR2',
      ]);

      mockManager.find.mockResolvedValue(products);
      mockManager.save.mockResolvedValue(testData.orderEntity);

      const item1 = OrderEntityTestFactory.createOrderItemEntity({
        productId: 'PR1',
      });
      const item2 = OrderEntityTestFactory.createOrderItemEntity({
        productId: 'PR1',
      });
      const item3 = OrderEntityTestFactory.createOrderItemEntity({
        productId: 'PR2',
      });

      const customOrderEntity = OrderEntityTestFactory.createOrderEntity({
        items: [item1, item2, item3],
      });

      const customOrder = OrderMapper.toDomain(customOrderEntity);

      const result = await repository.save(customOrder);

      expect(mockManager.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.anything(),
          }),
        }),
      );

      ResultAssertionHelper.assertResultSuccess(result);
    });
  });
});
