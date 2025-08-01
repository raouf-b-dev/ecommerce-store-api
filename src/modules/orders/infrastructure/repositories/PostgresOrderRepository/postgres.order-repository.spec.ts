// src/modules/orders/infrastructure/repositories/postgres-order.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresOrderRepository } from './postgres.order-repository';
import { OrderEntity } from '../../orm/order.schema';
import { Order } from '../../../domain/entities/order';
import { NotFoundException } from '@nestjs/common';

// We create a mock object for the TypeORM Repository.
const mockTypeOrmRepository = {
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  delete: jest.fn(),
};

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
    it('should create and save a new order', async () => {
      const order = new Order({ id: 1, totalPrice: 500 });
      const createdEntity = { id: 1, totalPrice: 500 };

      mockTypeOrmRepository.create.mockReturnValue(createdEntity);
      mockTypeOrmRepository.save.mockResolvedValue(createdEntity);

      await repository.save(order);

      expect(ormRepo.create).toHaveBeenCalledWith({
        id: 1,
        totalPrice: 500,
      });
      expect(ormRepo.save).toHaveBeenCalledWith(createdEntity);

      expect(ormRepo.create).toHaveBeenCalledTimes(1);
      expect(ormRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should update an existing order', async () => {
      const order = new Order({ id: 1, totalPrice: 999 });

      const existingEntity = { id: 1, totalPrice: 500 };
      const mergedEntity = { id: 1, totalPrice: 999 };

      mockTypeOrmRepository.findOne.mockResolvedValue(existingEntity);
      mockTypeOrmRepository.merge.mockReturnValue(mergedEntity);
      mockTypeOrmRepository.save.mockResolvedValue(mergedEntity);

      await repository.update(order);

      expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(ormRepo.merge).toHaveBeenCalledWith(existingEntity, {
        totalPrice: 999,
      });
      expect(ormRepo.save).toHaveBeenCalledWith(mergedEntity);

      expect(ormRepo.findOne).toHaveBeenCalledTimes(1);
      expect(ormRepo.merge).toHaveBeenCalledTimes(1);
      expect(ormRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      const order = new Order({ id: 999, totalPrice: 123 });
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      await expect(repository.update(order)).rejects.toThrow(NotFoundException);

      expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: 999 } });
      expect(ormRepo.findOne).toHaveBeenCalledTimes(1);

      expect(ormRepo.merge).not.toHaveBeenCalled();
      expect(ormRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find an order by id and return a domain Order object', async () => {
      const orderId = 1;
      const orderEntity = new OrderEntity();
      orderEntity.id = orderId;
      orderEntity.totalPrice = 100;

      mockTypeOrmRepository.findOne.mockResolvedValue(orderEntity);

      const result = await repository.findById(orderId);

      expect(result).not.toBeNull();
      if (result) {
        expect(result).toBeInstanceOf(Order);
        expect(result.id).toEqual(orderId);
        expect(result.totalPrice).toEqual(100);
      }
      expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: orderId } });
      expect(ormRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return null if no order is found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
      expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: 999 } });
      expect(ormRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return an array of domain Order objects', async () => {
      const orderEntity1 = new OrderEntity();
      orderEntity1.id = 1;
      orderEntity1.totalPrice = 100;

      const orderEntity2 = new OrderEntity();
      orderEntity2.id = 2;
      orderEntity2.totalPrice = 200;

      mockTypeOrmRepository.find.mockResolvedValue([
        orderEntity1,
        orderEntity2,
      ]);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Order);
      expect(result[0].id).toEqual(1);
      expect(result[0].totalPrice).toEqual(100);
      expect(result[1]).toBeInstanceOf(Order);
      expect(result[1].id).toEqual(2);
      expect(result[1].totalPrice).toEqual(200);

      expect(ormRepo.find).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array if no orders are found', async () => {
      mockTypeOrmRepository.find.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(0);
      expect(ormRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteById', () => {
    it('should delete an order by id', async () => {
      mockTypeOrmRepository.delete.mockResolvedValue(undefined);

      await repository.deleteById(1);

      expect(ormRepo.delete).toHaveBeenCalledWith(1);
      expect(ormRepo.delete).toHaveBeenCalledTimes(1);
    });
  });
});
