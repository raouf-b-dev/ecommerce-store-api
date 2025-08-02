// src/modules/orders/infrastructure/repositories/postgres-order.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from '../../orm/order.schema';
import { Order } from '../../../domain/entities/order';
import { isFailure, isSuccess } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { PostgresOrderRepository } from './postgres.order-repository';

// Mock repository for dependency injection
const mockTypeOrmRepository = {
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  delete: jest.fn(),
};

// Reusable test data
const orderDomain = new Order({ id: 1, totalPrice: 500 });
const orderEntity = { id: 1, totalPrice: 500 } as OrderEntity;
const dbError = new Error('DB Error');

describe('PostgresOrderRepository', () => {
  let repository: PostgresOrderRepository;
  let ormRepo: Repository<OrderEntity>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresOrderRepository,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<PostgresOrderRepository>(PostgresOrderRepository);
    ormRepo = module.get<Repository<OrderEntity>>(
      getRepositoryToken(OrderEntity),
    );
  });

  describe('save', () => {
    it('should successfully save a new order', async () => {
      mockTypeOrmRepository.create.mockReturnValue(orderEntity);
      mockTypeOrmRepository.save.mockResolvedValue(orderEntity);

      const result = await repository.save(orderDomain);

      expect(isSuccess(result)).toBe(true);
      // More specific check for void success
      if (isSuccess(result)) {
        expect(result.value).toBeUndefined();
      }
      expect(ormRepo.create).toHaveBeenCalledWith(orderDomain);
      expect(ormRepo.save).toHaveBeenCalledWith(orderEntity);
    });

    it('should return a failure if the database throws an error', async () => {
      mockTypeOrmRepository.save.mockRejectedValue(dbError);

      const result = await repository.save(orderDomain);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.cause).toBe(dbError);
      }
    });
  });

  describe('update', () => {
    it('should successfully update an existing order', async () => {
      const orderToUpdate = new Order({ id: 1, totalPrice: 999 });
      const mergedEntity = { ...orderEntity, totalPrice: 999 };

      mockTypeOrmRepository.findOne.mockResolvedValue(orderEntity);
      mockTypeOrmRepository.merge.mockReturnValue(mergedEntity);
      mockTypeOrmRepository.save.mockResolvedValue(mergedEntity);

      const result = await repository.update(orderToUpdate);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBeUndefined();
      }
      expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(ormRepo.merge).toHaveBeenCalledWith(orderEntity, {
        totalPrice: 999,
      });
      expect(ormRepo.save).toHaveBeenCalledWith(mergedEntity);
    });

    it('should return a failure if the order to update is not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.update(orderDomain);

      expect(isFailure(result)).toBe(true);
      expect(ormRepo.merge).not.toHaveBeenCalled();
      expect(ormRepo.save).not.toHaveBeenCalled();
    });

    it('should return a failure if the database throws an error during update', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(orderEntity);
      mockTypeOrmRepository.save.mockRejectedValue(dbError);

      const result = await repository.update(orderDomain);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.cause).toBe(dbError);
      }
    });
  });

  describe('findById', () => {
    it('should return the order when it is found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(orderEntity);

      const result = await repository.findById(1);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(orderEntity);
      }
      expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return a failure when the order is not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(isFailure(result)).toBe(true);
    });

    it('should return a failure if the database throws an error', async () => {
      mockTypeOrmRepository.findOne.mockRejectedValue(dbError);

      const result = await repository.findById(1);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.cause).toBe(dbError);
      }
    });
  });

  describe('findAll', () => {
    it('should return a list of orders', async () => {
      const orders = [orderEntity, { ...orderEntity, id: 2 }];
      mockTypeOrmRepository.find.mockResolvedValue(orders);

      const result = await repository.findAll();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value).toEqual(orders);
      }
    });

    it('should return a failure when no orders are found', async () => {
      mockTypeOrmRepository.find.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Did not find any orders');
      }
    });

    it('should return a failure if the database throws an error', async () => {
      mockTypeOrmRepository.find.mockRejectedValue(dbError);

      const result = await repository.findAll();

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.cause).toBe(dbError);
      }
    });
  });

  describe('deleteById', () => {
    it('should successfully delete an order', async () => {
      mockTypeOrmRepository.delete.mockResolvedValue(undefined);

      const result = await repository.deleteById(1);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBeUndefined();
      }
      expect(ormRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should return a failure if the database throws an error', async () => {
      mockTypeOrmRepository.delete.mockRejectedValue(dbError);

      const result = await repository.deleteById(1);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.cause).toBe(dbError);
      }
    });
  });
});
