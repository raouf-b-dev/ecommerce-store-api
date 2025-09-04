import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderEntity } from '../../orm/order.schema';
import { isFailure, isSuccess } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { PostgresOrderRepository } from './postgres.order-repository';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { DataSource } from 'typeorm';
import {
  AggregatedOrderInput,
  AggregatedUpdateInput,
} from '../../../domain/factories/order.factory';

describe('PostgresOrderRepository', () => {
  let repository: PostgresOrderRepository;
  let mockOrmRepo: any;
  let mockIdGen: jest.Mocked<IdGeneratorService>;
  let mockDataSource: any;
  let mockManager: any;

  const dbError = new Error('DB Error');

  const createOrderDto: AggregatedOrderInput = {
    customerId: 'CUST001',
    items: [
      {
        productId: 'PR0000001',
        productName: 'Product 1',
        unitPrice: 100,
        quantity: 2,
        lineTotal: 200,
      },
    ],
    status: 'pending' as any,
    totalPrice: 200,
  };

  const updateOrderDto: AggregatedUpdateInput = {
    totalPrice: 750,
    items: [
      {
        productId: 'PR0000001',
        productName: 'Product 1',
        unitPrice: 250,
        quantity: 3,
        lineTotal: 750,
      },
    ],
  };

  const generatedId = 'OR0000001';

  const orderEntity = {
    id: generatedId,
    customerId: createOrderDto.customerId,
    items: createOrderDto.items,
    totalPrice: 200,
    status: 'pending',
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockOrmRepo = {
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    mockIdGen = {
      generateOrderId: jest.fn(),
    } as any;

    const createQueryBuilderFactory = () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      return qb;
    };

    mockManager = {
      createQueryBuilder: jest
        .fn()
        .mockImplementation(createQueryBuilderFactory),
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
      find: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb: any) => {
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

  describe('save', () => {
    it('should successfully save a new order and return it', async () => {
      mockIdGen.generateOrderId.mockResolvedValue(generatedId);

      (mockManager.createQueryBuilder() as any).execute.mockResolvedValue({
        affected: 1,
      });

      const result = await repository.save(createOrderDto);

      expect(mockIdGen.generateOrderId).toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockManager.create).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalled();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBeDefined();
        expect(result.value.id).toEqual(generatedId);
        expect(result.value.customerId).toEqual(createOrderDto.customerId);
      }
    });

    it('should return failure if orm.save throws', async () => {
      mockIdGen.generateOrderId.mockResolvedValue(generatedId);

      mockManager.save.mockRejectedValue(dbError);

      const result = await repository.save(createOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        // ensure the original cause was wrapped
        expect((result.error as any).cause).toBe(dbError);
      }
    });
  });

  describe('update', () => {
    it('should successfully update an existing order', async () => {
      const existing = {
        ...orderEntity,
        items: orderEntity.items.map((i: any) => ({ ...i })),
      };

      mockManager.findOne.mockResolvedValue(existing);

      (mockManager.createQueryBuilder() as any).execute.mockResolvedValue({
        affected: 1,
      });

      const merged = {
        ...existing,
        ...updateOrderDto,
        updatedAt: new Date('2025-08-13T15:00:00Z'),
      };
      mockManager.save.mockResolvedValue(merged);

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
        expect(result.value.totalPrice).toEqual(updateOrderDto.totalPrice);
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

    it('should return failure if orm.save throws during update', async () => {
      const existing = {
        ...orderEntity,
        items: orderEntity.items.map((i: any) => ({ ...i })),
      };
      mockManager.findOne.mockResolvedValue(existing);

      (mockManager.createQueryBuilder() as any).execute.mockResolvedValue({
        affected: 1,
      });

      mockManager.save.mockRejectedValue(dbError);

      const result = await repository.update(generatedId, updateOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect((result.error as any).cause).toBe(dbError);
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
        expect((result.error as any).cause).toBe(dbError);
      }
    });
  });

  describe('findAll', () => {
    it('should return a list of orders', async () => {
      const orders = [orderEntity, { ...orderEntity, id: 'OR0000002' }];
      mockOrmRepo.find.mockResolvedValue(orders);

      const result = await repository.findAll();

      expect(mockOrmRepo.find).toHaveBeenCalled();
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(orders);
        expect(result.value).toHaveLength(2);
      }
    });

    it('should return failure if orm.find throws', async () => {
      mockOrmRepo.find.mockRejectedValue(dbError);

      const result = await repository.findAll();

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect((result.error as any).cause).toBe(dbError);
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

    it('should return failure if orm.delete throws', async () => {
      mockOrmRepo.delete.mockRejectedValue(dbError);

      const result = await repository.deleteById(generatedId);

      expect(mockOrmRepo.delete).toHaveBeenCalledWith(generatedId);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect((result.error as any).cause).toBe(dbError);
      }
    });
  });
});
