// src/modules/orders/infrastructure/repositories/postgres-order.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from '../../orm/order.schema';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { PostgresOrderRepository } from './postgres.order-repository';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { CreateOrderDto } from '../../../presentation/dto/create-order.dto';
import { UpdateOrderDto } from '../../../presentation/dto/update-order.dto';

describe('PostgresOrderRepository', () => {
  let repository: PostgresOrderRepository;
  let ormRepo: jest.Mocked<Repository<OrderEntity>>;
  let mockOrmRepo: any;
  let mockIdGen: jest.Mocked<IdGeneratorService>;

  const dbError = new Error('DB Error');

  const createOrderDto: CreateOrderDto = {
    // minimal fields required by CreateOrderDto in tests
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
  } as any;

  const updateOrderDto: UpdateOrderDto = {
    totalPrice: 750,
  } as any;

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
      ],
    }).compile();

    repository = module.get<PostgresOrderRepository>(PostgresOrderRepository);
    ormRepo = module.get(getRepositoryToken(OrderEntity)) as any;
  });

  describe('save', () => {
    it('should successfully save a new order and return it', async () => {
      mockIdGen.generateOrderId.mockResolvedValue(generatedId);

      const createdEntity = { ...orderEntity };
      mockOrmRepo.create.mockReturnValue(createdEntity);
      mockOrmRepo.save.mockResolvedValue(createdEntity);

      const result = await repository.save(createOrderDto);

      expect(mockIdGen.generateOrderId).toHaveBeenCalled();
      expect(mockOrmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: generatedId,
          ...createOrderDto,
          createdAt: expect.any(Date),
        }),
      );
      expect(mockOrmRepo.save).toHaveBeenCalledWith(createdEntity);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(createdEntity);
      }
    });

    it('should return failure if orm.save throws', async () => {
      mockIdGen.generateOrderId.mockResolvedValue(generatedId);
      mockOrmRepo.create.mockReturnValue(orderEntity);
      mockOrmRepo.save.mockRejectedValue(dbError);

      const result = await repository.save(createOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect((result.error as any).cause).toBe(dbError);
      }
    });
  });

  describe('update', () => {
    it('should successfully update an existing order', async () => {
      const existing = { ...orderEntity };
      const merged = {
        ...existing,
        ...updateOrderDto,
        updatedAt: new Date('2025-08-13T15:00:00Z'),
      };

      mockOrmRepo.findOne.mockResolvedValue(existing);
      mockOrmRepo.merge.mockReturnValue(merged);
      mockOrmRepo.save.mockResolvedValue(merged);

      const result = await repository.update(generatedId, updateOrderDto);

      expect(mockOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: generatedId },
      });
      expect(mockOrmRepo.merge).toHaveBeenCalledWith(
        existing,
        expect.objectContaining(updateOrderDto),
      );
      expect(mockOrmRepo.save).toHaveBeenCalledWith(merged);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(merged);
      }
    });

    it('should return failure if order to update is not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.update(generatedId, updateOrderDto);

      expect(mockOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: generatedId },
      });
      expect(mockOrmRepo.merge).not.toHaveBeenCalled();
      expect(mockOrmRepo.save).not.toHaveBeenCalled();

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain(
          `Order with ID ${generatedId} not found`,
        );
      }
    });

    it('should return failure if orm.save throws during update', async () => {
      const existing = { ...orderEntity };
      mockOrmRepo.findOne.mockResolvedValue(existing);
      mockOrmRepo.merge.mockReturnValue({ ...existing, ...updateOrderDto });
      mockOrmRepo.save.mockRejectedValue(dbError);

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

    it('should return failure when no orders are found', async () => {
      mockOrmRepo.find.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(mockOrmRepo.find).toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Did not find any orders');
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
      mockOrmRepo.delete.mockResolvedValue(undefined);

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
