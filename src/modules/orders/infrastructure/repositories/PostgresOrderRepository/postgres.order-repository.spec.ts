// src/modules/orders/infrastructure/repositories/PostgresOrderRepository/postgres.order-repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderEntity } from '../../orm/order.schema';
import { isFailure, isSuccess } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { PostgresOrderRepository } from './postgres.order-repository';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { DataSource, In } from 'typeorm';
import {
  AggregatedOrderInput,
  AggregatedUpdateInput,
} from '../../../domain/factories/order.factory';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { ProductEntity } from '../../../../products/infrastructure/orm/product.schema';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import { OrderStatus } from '../../../domain/value-objects/order-status';

describe('PostgresOrderRepository', () => {
  let repository: PostgresOrderRepository;
  let mockOrmRepo: any;
  let mockIdGen: jest.Mocked<IdGeneratorService>;
  let mockDataSource: any;
  let mockManager: any;
  let mockTxQb: any; // A single, reusable mock query builder for transactions

  const dbError = new Error('DB Error');

  const createOrderDto: AggregatedOrderInput = {
    customerId: 'CUST001',
    items: [
      {
        productId: 'PR0000001',
        quantity: 2,
      },
    ],
    status: 'pending' as any,
  };

  const updateOrderDto: AggregatedUpdateInput = {
    items: [
      {
        productId: 'PR0000001',
        quantity: 3,
      },
    ],
  };

  const generatedId = 'OR0000001';

  const mockProduct = {
    id: 'PR0000001',
    name: 'Test Product',
    price: 100,
    stockQuantity: 10,
  };

  const orderEntity = {
    id: generatedId,
    customerId: createOrderDto.customerId,
    items: [
      {
        productId: 'PR0000001',
        productName: 'Test Product',
        unitPrice: 100,
        quantity: 2,
        lineTotal: 200,
      },
    ],
    totalPrice: 200,
    status: 'pending',
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // ListOrders QB factory: returns a qb with spyable methods
    const createListQueryBuilder = () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([orderEntity]),
      };
      return qb;
    };

    // A single, reusable mock query builder for transactional tests.
    mockTxQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockOrmRepo = {
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      // createQueryBuilder used by ListOrders
      createQueryBuilder: jest.fn().mockImplementation(createListQueryBuilder),
    };

    mockIdGen = {
      generateOrderId: jest.fn(),
    } as any;

    mockManager = {
      // **FIX**: Always return the same mock query builder instance
      createQueryBuilder: jest.fn().mockReturnValue(mockTxQb),
      exists: jest.fn().mockResolvedValue(true),
      create: jest
        .fn()
        .mockImplementation((EntityClass: any, payload: any) => ({
          ...payload,
        })),
      save: jest
        .fn()
        .mockImplementation(async (entity: any) => ({ ...entity })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([mockProduct]), // Default to returning the mock product
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb: any) => {
        // invoke the callback with our mock manager
        return cb(mockManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresOrderRepository,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: mockOrmRepo,
        },
        {
          provide: IdGeneratorService,
          useValue: mockIdGen,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    repository = module.get<PostgresOrderRepository>(PostgresOrderRepository);
  });

  describe('ListOrders', () => {
    it('should return orders with default pagination/sort', async () => {
      const result = await repository.listOrders({});
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value.length).toBeGreaterThan(0);
      }

      expect(mockOrmRepo.createQueryBuilder).toHaveBeenCalledWith('order');
    });

    it('should apply filters and sorting when provided', async () => {
      // call the method
      const dto: ListOrdersQueryDto = {
        customerId: 'CUST001',
        status: OrderStatus.PENDING,
        sortBy: 'createdAt',
        sortOrder: 'asc',
        page: 2,
        limit: 5,
      };
      const result = await repository.listOrders(dto);

      expect(isSuccess(result)).toBe(true);

      // Grab the qb instance the repository actually used:
      const qb = mockOrmRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalled();
      expect(qb.skip).toHaveBeenCalledWith((2 - 1) * 5);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should return failure when query builder throws', async () => {
      mockOrmRepo.createQueryBuilder.mockImplementation(() => {
        throw dbError;
      });

      const result = await repository.listOrders({});
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(
          (result.error as any).cause || (result.error as any).original,
        ).toBeDefined();
      }
    });
  });

  describe('save', () => {
    beforeEach(() => {
      // Reset to default successful behavior for each test
      mockIdGen.generateOrderId.mockResolvedValue(generatedId);
      mockManager.find.mockResolvedValue([mockProduct]);
      mockTxQb.execute.mockResolvedValue({ affected: 1 }); // Use the shared mock
      mockManager.save.mockResolvedValue(orderEntity);
    });

    it('should successfully save a new order and return it', async () => {
      const result = await repository.save(createOrderDto);

      expect(mockIdGen.generateOrderId).toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalled();

      // Verify products were fetched
      expect(mockManager.find).toHaveBeenCalledWith(ProductEntity, {
        where: { id: In(['PR0000001']) },
      });

      // **FIX**: Verify stock was decremented on the shared mock instance
      expect(mockTxQb.update).toHaveBeenCalledWith(ProductEntity);
      expect(mockTxQb.set).toHaveBeenCalled();
      expect(mockTxQb.where).toHaveBeenCalled();

      // Verify order items were created
      expect(mockManager.create).toHaveBeenCalledWith(
        OrderItemEntity,
        expect.objectContaining({
          productId: 'PR0000001',
          productName: 'Test Product',
          unitPrice: 100,
          quantity: 2,
          lineTotal: 200,
        }),
      );

      // Verify order was created and saved
      expect(mockManager.create).toHaveBeenCalledWith(
        OrderEntity,
        expect.objectContaining({
          id: generatedId,
          customerId: createOrderDto.customerId,
          totalPrice: 200,
        }),
      );
      expect(mockManager.save).toHaveBeenCalled();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.id).toEqual(generatedId);
        expect(result.value.customerId).toEqual(createOrderDto.customerId);
        expect(result.value.items).toBeDefined();
      }
    });

    it('should return failure if manager.save throws', async () => {
      mockManager.save.mockRejectedValue(dbError);

      const result = await repository.save(createOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(
          (result.error as any).cause || (result.error as any).original,
        ).toBeDefined();
      }
    });

    it('should return PRODUCT_NOT_FOUND when product does not exist', async () => {
      // No products found
      mockManager.find.mockResolvedValue([]);

      const result = await repository.save(createOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('PRODUCT_NOT_FOUND');
      }
    });

    it('should return PRODUCT_NOT_FOUND when product does not exist during stock decrement', async () => {
      // **FIX**: Modify the shared mock's behavior for this specific test
      mockTxQb.execute.mockResolvedValue({ affected: 0 });
      mockManager.exists.mockResolvedValueOnce(false);

      const result = await repository.save(createOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('PRODUCT_NOT_FOUND');
      }
    });

    it('should return INSUFFICIENT_STOCK when stock insufficient during save', async () => {
      // **FIX**: Modify the shared mock's behavior for this specific test
      mockTxQb.execute.mockResolvedValue({ affected: 0 });
      mockManager.exists.mockResolvedValueOnce(true);

      const result = await repository.save(createOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('INSUFFICIENT_STOCK');
      }
    });

    it('should return INVALID_QUANTITY for invalid quantities', async () => {
      const invalidOrderDto = {
        ...createOrderDto,
        items: [{ productId: 'PR0000001', quantity: -1 }],
      };

      const result = await repository.save(invalidOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('INVALID_QUANTITY');
      }
    });
  });

  describe('update', () => {
    beforeEach(() => {
      // Reset to default successful behavior
      const existing = {
        ...orderEntity,
        items: [{ productId: 'PR0000001', quantity: 1 }],
      };

      mockManager.findOne.mockResolvedValue(existing);
      mockManager.find.mockResolvedValue([mockProduct]);
      mockTxQb.execute.mockResolvedValue({ affected: 1 }); // Use shared mock
      mockManager.save.mockResolvedValue({
        ...existing,
        ...updateOrderDto,
        updatedAt: new Date(),
      });
    });

    it('should successfully update an existing order', async () => {
      const result = await repository.update(generatedId, updateOrderDto);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockManager.findOne).toHaveBeenCalledWith(OrderEntity, {
        where: { id: generatedId },
        relations: ['items'],
      });

      expect(mockManager.save).toHaveBeenCalled();
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveProperty('updatedAt');
      }
    });

    it('should return failure if order to update is not found', async () => {
      mockManager.findOne.mockResolvedValue(null);

      const result = await repository.update(generatedId, updateOrderDto);

      expect(mockManager.findOne).toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain(
          `ORDER_NOT_FOUND: Order with ID ${generatedId} not found`,
        );
      }
    });

    it('should return failure if manager.save throws during update', async () => {
      mockManager.save.mockRejectedValue(dbError);

      const result = await repository.update(generatedId, updateOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(
          (result.error as any).cause || (result.error as any).original,
        ).toBeDefined();
      }
    });

    it('should return PRODUCT_NOT_FOUND when update includes non-existent product', async () => {
      // No products found for the new items
      mockManager.find.mockResolvedValue([]);

      const result = await repository.update(generatedId, updateOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('PRODUCT_NOT_FOUND');
      }
    });

    it('should return PRODUCT_NOT_FOUND when update increases qty but product missing during stock check', async () => {
      // **FIX**: Modify the shared mock's behavior for this specific test
      mockTxQb.execute.mockResolvedValue({ affected: 0 });
      mockManager.exists.mockResolvedValueOnce(false);

      const result = await repository.update(generatedId, updateOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('PRODUCT_NOT_FOUND');
      }
    });

    it('should return INSUFFICIENT_STOCK when update tries to increase quantity but not enough stock', async () => {
      // **FIX**: Modify the shared mock's behavior for this specific test
      mockTxQb.execute.mockResolvedValue({ affected: 0 });
      mockManager.exists.mockResolvedValueOnce(true);

      const result = await repository.update(generatedId, updateOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('INSUFFICIENT_STOCK');
      }
    });

    it('should return INVALID_QUANTITY for invalid quantities in update', async () => {
      const invalidUpdateDto = {
        ...updateOrderDto,
        items: [{ productId: 'PR0000001', quantity: 0 }],
      };

      const result = await repository.update(generatedId, invalidUpdateDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('INVALID_QUANTITY');
      }
    });
  });

  describe('findById', () => {
    it('should return the order when found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(orderEntity);

      const result = await repository.findById(generatedId);

      expect(mockOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: generatedId },
        relations: ['items'],
      });
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(orderEntity);
      }
    });

    it('should return failure when order is not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById('missing-id');

      expect(mockOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'missing-id' },
        relations: ['items'],
      });
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Order not found');
      }
    });

    it('should return failure if orm throws', async () => {
      mockOrmRepo.findOne.mockRejectedValue(dbError);

      const result = await repository.findById(generatedId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(
          (result.error as any).cause || (result.error as any).original,
        ).toBeDefined();
      }
    });
  });

  describe('deleteById', () => {
    it('should successfully delete an order', async () => {
      mockOrmRepo.delete.mockResolvedValue({ affected: 1 });

      const result = await repository.deleteById(generatedId);

      expect(mockOrmRepo.delete).toHaveBeenCalledWith(generatedId);
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBeUndefined();
      }
    });

    it('should return failure when no row was deleted (not found)', async () => {
      mockOrmRepo.delete.mockResolvedValue({ affected: 0 });

      const result = await repository.deleteById(generatedId);

      expect(mockOrmRepo.delete).toHaveBeenCalledWith(generatedId);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Order not found');
      }
    });

    it('should return failure if orm.delete throws', async () => {
      mockOrmRepo.delete.mockRejectedValue(dbError);

      const result = await repository.deleteById(generatedId);

      expect(mockOrmRepo.delete).toHaveBeenCalledWith(generatedId);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(
          (result.error as any).cause || (result.error as any).original,
        ).toBeDefined();
      }
    });
  });

  describe('cancelById', () => {
    beforeEach(() => {
      mockManager.findOne = jest.fn().mockResolvedValue({
        ...orderEntity,
        items: [
          {
            productId: 'PR0000001',
            quantity: 2,
          },
        ],
      });

      mockManager.createQueryBuilder.mockReturnValue(mockTxQb);
      mockTxQb.update.mockReturnThis();
      mockTxQb.set.mockReturnThis();
      mockTxQb.where.mockReturnThis();
      mockTxQb.execute.mockResolvedValue({ affected: 1 });

      mockManager.save = jest.fn().mockResolvedValue({
        ...orderEntity,
        status: OrderStatus.CANCELLED,
        updatedAt: new Date(),
      });
    });

    it('should successfully cancel an order by ID', async () => {
      const result = await repository.cancelById(generatedId);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockManager.findOne).toHaveBeenCalledWith(OrderEntity, {
        where: { id: generatedId },
        relations: ['items'],
      });

      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
      expect(mockTxQb.update).toHaveBeenCalledWith(ProductEntity);
      expect(mockTxQb.set).toHaveBeenCalled();
      expect(mockTxQb.where).toHaveBeenCalled();

      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELLED }),
      );

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.status).toBe(OrderStatus.CANCELLED);
      }
    });

    it('should return failure if no order was found', async () => {
      mockManager.findOne.mockResolvedValue(null);

      const result = await repository.cancelById(generatedId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain(
          `ORDER_NOT_FOUND: Order with ID ${generatedId} not found`,
        );
      }
    });

    it('should return RepositoryError if query builder throws', async () => {
      mockTxQb.execute.mockRejectedValue(dbError);

      const result = await repository.cancelById(generatedId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(
          (result.error as any).cause || (result.error as any).original,
        ).toBeDefined();
      }
    });

    it('should return failure if order status cannot be cancelled', async () => {
      mockManager.findOne.mockResolvedValue({
        ...orderEntity,
        status: OrderStatus.SHIPPED,
        items: [],
      });

      const result = await repository.cancelById(generatedId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('ORDER_CANNOT_BE_CANCELLED');
      }
    });
  });
});
