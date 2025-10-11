// src/order/infrastructure/postgres-order.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { OrderEntity } from '../../orm/order.schema';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { AggregatedOrderInput } from '../../../domain/factories/order.factory';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import { CreateOrderItemDto } from '../../../presentation/dto/create-order-item.dto';
import { ProductEntity } from '../../../../products/infrastructure/orm/product.schema';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { PaymentMethod } from '../../../domain/value-objects/payment-method';
import { PaymentStatus } from '../../../domain/value-objects/payment-status';
import { PostgresOrderRepository } from './postgres.order-repository';
import { Order } from '../../../domain/entities/order';

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
  const createOrderDto: AggregatedOrderInput = {
    customerInfo: {
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    },
    items: [{ productId: 'PR0000001', quantity: 2 }],
    shippingAddress: {
      firstName: 'Jane',
      lastName: 'Smith',
      street: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'us',
    },
    paymentInfo: { method: PaymentMethod.CASH_ON_DELIVERY },
  };
  const mockProduct: ProductEntity = {
    id: 'PR0000001',
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
    productId: 'PR0000001',
    productName: 'Test Product',
    unitPrice: 100,
    quantity: 2,
    lineTotal: 200,
    order: null as any,
    product: mockProduct,
  };
  const mockOrderEntity: OrderEntity = {
    id: 'OR0000001',
    customerId: 'CUST0000001',
    shippingAddressId: 'ADDR0000001',
    paymentInfoId: 'PAY0000001',
    customerInfo: {
      customerId: 'CUST0000001',
      email: 'jane.smith@example.com',
      phone: undefined,
      firstName: 'Jane',
      lastName: 'Smith',
    },
    items: [mockOrderItemEntity1],
    shippingAddress: {
      id: 'ADDR0000001',
      firstName: 'Jane',
      lastName: 'Smith',
      street: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'us',
      phone: undefined,
    },
    paymentInfo: {
      id: 'PAY0000001',
      method: PaymentMethod.CASH_ON_DELIVERY,
      status: PaymentStatus.PENDING,
      amount: 200,
      transactionId: undefined,
      paidAt: undefined,
      notes: undefined,
    },
    customerNotes: undefined,
    subtotal: 200,
    shippingCost: 0,
    totalPrice: 200,
    status: OrderStatus.PENDING,
    createdAt: new Date('2025-10-01T10:00:00.000Z'),
    updatedAt: new Date('2025-10-01T10:00:00.000Z'),
  };

  const mockDomainPrimitives = {
    id: 'OR0000001',
    customerId: 'CUST0000001',
    shippingAddressId: 'ADDR0000001',
    paymentInfoId: 'PAY0000001',
    customerInfo: {
      customerId: 'CUST0000001',
      email: 'jane.smith@example.com',
      phone: undefined,
      firstName: 'Jane',
      lastName: 'Smith',
    },
    items: [
      {
        id: '370cbbcf-c0f2-4b1e-94ef-d87526b2c069',
        productId: 'PR0000001',
        productName: 'Test Product',
        unitPrice: 100,
        quantity: 2,
        lineTotal: 200,
      },
    ],
    shippingAddress: {
      id: 'ADDR0000001',
      firstName: 'Jane',
      lastName: 'Smith',
      street: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'us',
      phone: undefined,
    },
    paymentInfo: {
      id: 'PAY0000001',
      method: PaymentMethod.CASH_ON_DELIVERY,
      status: PaymentStatus.PENDING,
      amount: 200,
      transactionId: undefined,
      paidAt: undefined,
      notes: undefined,
    },
    customerNotes: undefined,
    subtotal: 200,
    shippingCost: 0,
    totalPrice: 200,
    status: OrderStatus.PENDING,
    createdAt: new Date('2025-10-01T10:00:00.000Z'),
    updatedAt: new Date('2025-10-01T10:00:00.000Z'),
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
        customerId: 'CUST0000001',
        status: OrderStatus.PENDING,
        sortBy: 'totalPrice',
        sortOrder: 'asc',
      };
      const result = await repository.listOrders(dto);
      expect(result.isSuccess).toBe(true);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.customerId = :customerId',
        { customerId: 'CUST0000001' },
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
      const result = await repository.save(createOrderDto);
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess)
        expect(result.value).toEqual({
          ...mockDomainPrimitives,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          items: [
            {
              ...mockDomainPrimitives.items[0],
              id: expect.any(String),
            },
          ],
        });
      expect(mockIdGen.generateOrderId).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalled();
    });
    it('should fail if product not found', async () => {
      mockManager.find.mockResolvedValue([]);
      const result = await repository.save(createOrderDto);
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('PRODUCT_NOT_FOUND');
    });
    it('should fail on invalid quantity', async () => {
      const invalidDto = {
        ...createOrderDto,
        items: [{ productId: 'PR0000001', quantity: 0 }],
      };
      mockManager.find.mockResolvedValue([mockProduct]);
      const result = await repository.save(invalidDto);
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('INVALID_QUANTITY');
    });
    it('should fail on insufficient stock', async () => {
      mockManager.find.mockResolvedValue([mockProduct]);
      mockTxQb.execute.mockResolvedValue({ raw: [], affected: 0 });
      mockManager.exists.mockResolvedValue(true);
      const result = await repository.save(createOrderDto);
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('INSUFFICIENT_STOCK');
    });
    it('should return error on DB failure', async () => {
      mockManager.find.mockRejectedValue(new Error('DB Error'));
      const result = await repository.save(createOrderDto);
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to create order');
    });
  });
  describe('updateItemsInfo', () => {
    it('should update order items successfully', async () => {
      const updateDto: CreateOrderItemDto[] = [
        { productId: 'PR0000001', quantity: 3 },
      ];
      mockManager.findOne.mockResolvedValue(mockOrderEntity);
      mockManager.find.mockResolvedValue([mockProduct]);
      mockTxQb.execute.mockResolvedValue({ raw: [], affected: 1 });
      mockManager.delete.mockResolvedValue({ raw: [], affected: 1 });
      mockManager.save.mockResolvedValue(mockOrderEntity);
      const result = await repository.updateItemsInfo('OR0000001', updateDto);
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(mockOrderEntity);
      expect(mockManager.save).toHaveBeenCalled();
    });
    it('should fail if order not found', async () => {
      mockManager.findOne.mockResolvedValue(null);
      const result = await repository.updateItemsInfo('OR0000001', []);
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('ORDER_NOT_FOUND');
    });
    it('should fail if product not found during update', async () => {
      mockManager.findOne.mockResolvedValue(mockOrderEntity);
      mockManager.find.mockResolvedValue([]);
      const updateDto: CreateOrderItemDto[] = [
        { productId: 'PR0000002', quantity: 1 },
      ];
      const result = await repository.updateItemsInfo('OR0000001', updateDto);
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('PRODUCT_NOT_FOUND');
    });
    it('should fail on insufficient stock during update', async () => {
      const updateDto: CreateOrderItemDto[] = [
        { productId: 'PR0000001', quantity: 20 },
      ];
      mockManager.findOne.mockResolvedValue(mockOrderEntity);
      mockManager.find.mockResolvedValue([mockProduct]);
      mockTxQb.execute.mockResolvedValue({ raw: [], affected: 0 });
      mockManager.exists.mockResolvedValue(true);
      const result = await repository.updateItemsInfo('OR0000001', updateDto);
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('INSUFFICIENT_STOCK');
    });
    it('should return error on DB failure', async () => {
      mockManager.findOne.mockRejectedValue(new Error('DB Error'));
      const result = await repository.updateItemsInfo('OR0000001', []);
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to update order');
    });
  });
  describe('findById', () => {
    it('should find order by id successfully', async () => {
      mockOrmRepo.findOne.mockResolvedValue(mockOrderEntity);
      const result = await repository.findById('OR0000001');
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess)
        expect(result.value).toEqual(
          Order.fromPrimitives(mockDomainPrimitives),
        );
    });
    it('should return error if order not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('OR0000001');
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Order not found');
    });
    it('should return error on DB failure', async () => {
      mockOrmRepo.findOne.mockRejectedValue(new Error('DB Error'));
      const result = await repository.findById('OR0000001');
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to find the order');
    });
  });
  describe('deleteById', () => {
    it('should delete order by id successfully', async () => {
      mockOrmRepo.delete.mockResolvedValue({ raw: [], affected: 1 });
      const result = await repository.deleteById('OR0000001');
      expect(result.isSuccess).toBe(true);
    });
    it('should return error if order not found', async () => {
      mockOrmRepo.delete.mockResolvedValue({ raw: [], affected: 0 });
      const result = await repository.deleteById('OR0000001');
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Order not found');
    });
    it('should return error on DB failure', async () => {
      mockOrmRepo.delete.mockRejectedValue(new Error('DB Error'));
      const result = await repository.deleteById('OR0000001');
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to delete the order');
    });
  });
  describe('cancelOrder', () => {
    it('should return error on DB failure (save fails)', async () => {
      mockManager.save.mockRejectedValue(new Error('DB Error'));

      const cancelledOrder: Order = Order.fromPrimitives(mockDomainPrimitives);
      cancelledOrder.cancel();
      const result = await repository.cancelOrder(cancelledOrder);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to cancel order');
    });

    it('should cancel order and restore stock for each item (success)', async () => {
      mockTxQb.execute.mockResolvedValue({ raw: [], affected: 1 });
      mockManager.save.mockResolvedValue({
        ...mockOrderEntity,
        status: OrderStatus.CANCELLED,
      });

      const cancelledOrder: Order = Order.fromPrimitives(mockDomainPrimitives);
      cancelledOrder.cancel();

      const result = await repository.cancelOrder(cancelledOrder);

      expect(result.isSuccess).toBe(true);

      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
      expect(mockTxQb.update).toHaveBeenCalled();
      const itemProductId = mockDomainPrimitives.items[0].productId;
      expect(mockTxQb.where).toHaveBeenCalledWith('id = :id', {
        id: itemProductId,
      });
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should return error when updating product stock fails (query builder execute rejects)', async () => {
      mockTxQb.execute.mockRejectedValue(
        new Error('DB Error during stock restore'),
      );

      const cancelledOrder: Order = Order.fromPrimitives(mockDomainPrimitives);
      cancelledOrder.cancel();

      const result = await repository.cancelOrder(cancelledOrder);

      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toBe('Failed to cancel order');
    });

    it('should restore stock for multiple items when order has many items', async () => {
      const multiItemPrimitives = {
        ...mockDomainPrimitives,
        items: [
          { ...mockDomainPrimitives.items[0] },
          {
            id: 'b1d2c3d4-e5f6-4789-9abc-def012345678',
            productId: 'PR0000002',
            productName: 'Second Product',
            unitPrice: 50,
            quantity: 1,
            lineTotal: 50,
          },
        ],
      };

      mockManager.createQueryBuilder.mockClear();
      mockTxQb.update.mockClear();
      mockTxQb.where.mockClear();
      mockTxQb.execute.mockResolvedValue({ raw: [], affected: 1 });
      mockManager.save.mockResolvedValue({
        ...mockOrderEntity,
        id: 'OR0000001',
      });

      const cancelledOrder: Order = Order.fromPrimitives(multiItemPrimitives);
      cancelledOrder.cancel();

      const result = await repository.cancelOrder(cancelledOrder);

      expect(result.isSuccess).toBe(true);

      expect(mockManager.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(mockTxQb.where).toHaveBeenCalledWith('id = :id', {
        id: 'PR0000001',
      });
      expect(mockTxQb.where).toHaveBeenCalledWith('id = :id', {
        id: 'PR0000002',
      });
      expect(mockManager.save).toHaveBeenCalled();
    });
  });
});
