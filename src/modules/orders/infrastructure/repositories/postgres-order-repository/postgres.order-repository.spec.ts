// src/order/infrastructure/postgres-order.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { OrderEntity } from '../../orm/order.schema';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import { CreateOrderItemDto } from '../../../presentation/dto/create-order-item.dto';
import { ProductEntity } from '../../../../products/infrastructure/orm/product.schema';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { PostgresOrderRepository } from './postgres.order-repository';
import { Order } from '../../../domain/entities/order';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { CreateOrderDtoTestFactory } from '../../../testing/factories/create-order-dto.factory';

describe('PostgresOrderRepository', () => {
  let repository: PostgresOrderRepository;
  let mockOrmRepo: jest.Mocked<Repository<OrderEntity>>;
  let mockIdGen: jest.Mocked<IdGeneratorService>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockManager: any;
  let mockTxQb: any;

  const generatedId = 'OR0000001';
  const generatedCustomerId = 'CUST0000001';
  const generatedPaymentInfoId = 'PAY0000001';
  const generatedShippingAddressId = 'ADDR0000001';

  // FIXED: Create DTO with COD payment method
  const createOrderDto = CreateOrderDtoTestFactory.createCashOnDeliveryDto();

  // FIXED: Update mock order to match COD payment
  const mockOrderPrimitives = OrderTestFactory.createCashOnDeliveryOrder({
    id: generatedId,
    customerId: generatedCustomerId,
    paymentInfoId: generatedPaymentInfoId,
    shippingAddressId: generatedShippingAddressId,
  });

  // FIXED: Match product ID with DTO (PR3)
  const mockProduct: ProductEntity = {
    id: 'PR3', // Changed from PR0000001 to match DTO
    name: 'Test Product',
    description: 'A test product',
    price: 100,
    sku: 'TEST-001',
    stockQuantity: 10,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-08-13T15:00:00Z'),
  };

  const mockOrderItemEntity1: OrderItemEntity = {
    id: '370cbbcf-c0f2-4b1e-94ef-d87526b2c069',
    productId: 'PR3', // Changed to match
    productName: 'Test Product',
    unitPrice: 100,
    quantity: 1, // Changed from 2 to match DTO
    lineTotal: 100,
    order: null as any,
    product: mockProduct,
  };

  const mockOrderEntity: OrderEntity = {
    id: generatedId,
    customerId: generatedCustomerId,
    shippingAddressId: generatedShippingAddressId,
    paymentInfoId: generatedPaymentInfoId,
    customerInfo: mockOrderPrimitives.customerInfo,
    items: [mockOrderItemEntity1],
    shippingAddress: mockOrderPrimitives.shippingAddress,
    paymentInfo: mockOrderPrimitives.paymentInfo,
    customerNotes: mockOrderPrimitives.customerNotes,
    subtotal: mockOrderPrimitives.subtotal,
    shippingCost: mockOrderPrimitives.shippingCost,
    totalPrice: mockOrderPrimitives.totalPrice,
    status: OrderStatus.PENDING,
    createdAt: mockOrderPrimitives.createdAt,
    updatedAt: mockOrderPrimitives.updatedAt,
  };

  beforeEach(async () => {
    mockOrmRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockIdGen = {
      generateOrderId: jest.fn().mockResolvedValue(generatedId),
      generateCustomerId: jest.fn().mockResolvedValue(generatedCustomerId),
      generatePaymentInfoId: jest
        .fn()
        .mockResolvedValue(generatedPaymentInfoId),
      generateShippingAddressId: jest
        .fn()
        .mockResolvedValue(generatedShippingAddressId),
    } as any;

    mockTxQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw: [], affected: 1 }),
    };

    mockManager = {
      find: jest.fn().mockResolvedValue([mockProduct]),
      exists: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(mockOrderEntity),
      delete: jest.fn().mockResolvedValue({ raw: [], affected: 1 }),
      findOne: jest.fn().mockResolvedValue(mockOrderEntity),
      createQueryBuilder: jest.fn().mockReturnValue(mockTxQb),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockManager)),
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('listOrders', () => {
    it('should list orders successfully with default params', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockOrderEntity]),
      } as unknown as SelectQueryBuilder<OrderEntity>;

      mockOrmRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const dto: ListOrdersQueryDto = {};
      const result = await repository.listOrders(dto);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual([mockOrderEntity]);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'order.createdAt',
        'DESC',
      );
    });

    it('should list orders with filters', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockOrderEntity]),
      } as unknown as SelectQueryBuilder<OrderEntity>;

      mockOrmRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const dto: ListOrdersQueryDto = {
        page: 2,
        limit: 5,
        customerId: generatedCustomerId,
        status: OrderStatus.PENDING,
        sortBy: 'totalPrice',
        sortOrder: 'asc',
      };

      const result = await repository.listOrders(dto);

      expect(result.isSuccess).toBe(true);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.customerId = :customerId',
        { customerId: generatedCustomerId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.status = :status',
        { status: OrderStatus.PENDING },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'order.totalPrice',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should return error on failure', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockRejectedValue(new Error('DB Error')),
      } as unknown as SelectQueryBuilder<OrderEntity>;

      mockOrmRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const dto: ListOrdersQueryDto = {};
      const result = await repository.listOrders(dto);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to list orders');
    });
  });

  describe('save', () => {
    it('should save order successfully', async () => {
      mockManager.find.mockResolvedValue([mockProduct]);
      mockTxQb.execute.mockResolvedValue({ raw: [], affected: 1 });
      mockManager.save.mockResolvedValue(mockOrderEntity);

      const result = await repository.save(createOrderDto as any);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.id).toBe(generatedId);
        expect(result.value.customerId).toBe(generatedCustomerId);
      }
      expect(mockIdGen.generateOrderId).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should fail if product not found', async () => {
      mockManager.find.mockResolvedValue([]);

      const result = await repository.save(createOrderDto as any);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('PRODUCT_NOT_FOUND');
    });

    it('should fail on invalid quantity', async () => {
      const invalidDto = CreateOrderDtoTestFactory.createCashOnDeliveryDto();
      invalidDto.items = [{ productId: 'PR3', quantity: 0 }]; // Use PR3

      mockManager.find.mockResolvedValue([mockProduct]);

      const result = await repository.save(invalidDto as any);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('INVALID_QUANTITY');
    });

    it('should fail on insufficient stock', async () => {
      mockManager.find.mockResolvedValue([mockProduct]);
      mockTxQb.execute.mockResolvedValue({ raw: [], affected: 0 });
      mockManager.exists.mockResolvedValue(true);

      const result = await repository.save(createOrderDto as any);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('INSUFFICIENT_STOCK');
    });

    it('should return error on DB failure', async () => {
      mockManager.find.mockRejectedValue(new Error('DB Error'));

      const result = await repository.save(createOrderDto as any);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to create order');
    });

    it('should save order with multiple items', async () => {
      const multiItemDto = CreateOrderDtoTestFactory.createMultiItemDto([
        'PR1',
        'PR2',
        'PR3',
      ]);
      const products = [
        { ...mockProduct, id: 'PR1' },
        { ...mockProduct, id: 'PR2' },
        { ...mockProduct, id: 'PR3' },
      ];

      mockManager.find.mockResolvedValue(products);
      mockTxQb.execute.mockResolvedValue({ raw: [], affected: 1 });
      mockManager.save.mockResolvedValue(mockOrderEntity);

      const result = await repository.save(multiItemDto as any);

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('updateItemsInfo', () => {
    it('should update order items successfully', async () => {
      const updateDto: CreateOrderItemDto[] = [
        { productId: 'PR3', quantity: 3 }, // Use PR3
      ];

      mockManager.findOne.mockResolvedValue(mockOrderEntity);
      mockManager.find.mockResolvedValue([mockProduct]);
      mockTxQb.execute.mockResolvedValue({ raw: [], affected: 1 });
      mockManager.delete.mockResolvedValue({ raw: [], affected: 1 });
      mockManager.save.mockResolvedValue(mockOrderEntity);

      const result = await repository.updateItemsInfo(generatedId, updateDto);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(mockOrderEntity);
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should fail if order not found', async () => {
      mockManager.findOne.mockResolvedValue(null);

      const result = await repository.updateItemsInfo(generatedId, []);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('ORDER_NOT_FOUND');
    });

    it('should fail if product not found during update', async () => {
      mockManager.findOne.mockResolvedValue(mockOrderEntity);
      mockManager.find.mockResolvedValue([]);

      const updateDto: CreateOrderItemDto[] = [
        { productId: 'PR999', quantity: 1 },
      ];
      const result = await repository.updateItemsInfo(generatedId, updateDto);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('PRODUCT_NOT_FOUND');
    });

    it('should fail on insufficient stock during update', async () => {
      const updateDto: CreateOrderItemDto[] = [
        { productId: 'PR3', quantity: 20 },
      ];

      mockManager.findOne.mockResolvedValue(mockOrderEntity);
      mockManager.find.mockResolvedValue([mockProduct]);
      mockTxQb.execute.mockResolvedValue({ raw: [], affected: 0 });
      mockManager.exists.mockResolvedValue(true);

      const result = await repository.updateItemsInfo(generatedId, updateDto);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('INSUFFICIENT_STOCK');
    });

    it('should return error on DB failure', async () => {
      mockManager.findOne.mockRejectedValue(new Error('DB Error'));

      const result = await repository.updateItemsInfo(generatedId, []);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to update order');
    });
  });

  describe('findById', () => {
    it('should find order by id successfully', async () => {
      mockOrmRepo.findOne.mockResolvedValue(mockOrderEntity);

      const result = await repository.findById(generatedId);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toBeInstanceOf(Order);
        expect(result.value.id).toBe(generatedId);
      }
    });

    it('should return error if order not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(generatedId);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Order not found');
    });

    it('should return error on DB failure', async () => {
      mockOrmRepo.findOne.mockRejectedValue(new Error('DB Error'));

      const result = await repository.findById(generatedId);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to find the order');
    });
  });

  describe('deleteById', () => {
    it('should delete order by id successfully', async () => {
      mockOrmRepo.delete.mockResolvedValue({ raw: [], affected: 1 });

      const result = await repository.deleteById(generatedId);

      expect(result.isSuccess).toBe(true);
    });

    it('should return error if order not found', async () => {
      mockOrmRepo.delete.mockResolvedValue({ raw: [], affected: 0 });

      const result = await repository.deleteById(generatedId);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Order not found');
    });

    it('should return error on DB failure', async () => {
      mockOrmRepo.delete.mockRejectedValue(new Error('DB Error'));

      const result = await repository.deleteById(generatedId);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to delete the order');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order and restore stock for each item (success)', async () => {
      mockTxQb.execute.mockResolvedValue({ raw: [], affected: 1 });
      mockManager.save.mockResolvedValue({
        ...mockOrderEntity,
        status: OrderStatus.CANCELLED,
      });

      const orderToCancel = OrderTestFactory.createCancellableOrder({
        id: generatedId,
      });
      const cancelledOrder = Order.fromPrimitives(orderToCancel);
      cancelledOrder.cancel();

      const result = await repository.cancelOrder(
        cancelledOrder.toPrimitives(),
      );

      expect(result.isSuccess).toBe(true);
      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
      expect(mockTxQb.update).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should return error on DB failure (save fails)', async () => {
      mockManager.save.mockRejectedValue(new Error('DB Error'));

      const orderToCancel = OrderTestFactory.createCancellableOrder({
        id: generatedId,
      });
      const cancelledOrder = Order.fromPrimitives(orderToCancel);
      cancelledOrder.cancel();

      const result = await repository.cancelOrder(
        cancelledOrder.toPrimitives(),
      );

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to cancel order');
    });

    it('should return error when updating product stock fails', async () => {
      mockTxQb.execute.mockRejectedValue(
        new Error('DB Error during stock restore'),
      );

      const orderToCancel = OrderTestFactory.createCancellableOrder({
        id: generatedId,
      });
      const cancelledOrder = Order.fromPrimitives(orderToCancel);
      cancelledOrder.cancel();

      const result = await repository.cancelOrder(
        cancelledOrder.toPrimitives(),
      );

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to cancel order');
    });

    it('should restore stock for multiple items when order has many items', async () => {
      const multiItemOrder = OrderTestFactory.createMultiItemOrder(3);
      const cancelledOrder = Order.fromPrimitives(multiItemOrder);
      cancelledOrder.cancel();

      mockManager.createQueryBuilder.mockClear();
      mockTxQb.update.mockClear();
      mockTxQb.where.mockClear();
      mockTxQb.execute.mockResolvedValue({ raw: [], affected: 1 });
      mockManager.save.mockResolvedValue({
        ...mockOrderEntity,
        id: multiItemOrder.id,
      });

      const result = await repository.cancelOrder(
        cancelledOrder.toPrimitives(),
      );

      expect(result.isSuccess).toBe(true);
      expect(mockManager.createQueryBuilder).toHaveBeenCalledTimes(3); // Once per item
      expect(mockManager.save).toHaveBeenCalled();
    });
  });
});
