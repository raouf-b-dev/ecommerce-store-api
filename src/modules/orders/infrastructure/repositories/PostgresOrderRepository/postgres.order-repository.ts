// src/order/infrastructure/postgres-order.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderEntity } from '../../orm/order.schema';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { CreateOrderDto } from '../../../presentation/dto/create-order.dto';
import { UpdateOrderDto } from '../../../presentation/dto/update-order.dto';

@Injectable()
export class PostgresOrderRepository implements OrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ormRepo: Repository<OrderEntity>,
    private idGeneratorService: IdGeneratorService,
  ) {}

  async save(
    createOrderDto: CreateOrderDto,
  ): Promise<Result<IOrder, RepositoryError>> {
    try {
      const id = await this.idGeneratorService.generateOrderId();

      const entity = this.ormRepo.create({
        id,
        ...createOrderDto,
        createdAt: new Date(),
      });
      await this.ormRepo.save(entity);

      return Result.success<IOrder>(entity);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to save the order`, error);
    }
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<Result<IOrder, RepositoryError>> {
    try {
      // Ensure the order exists first
      const existing = await this.ormRepo.findOne({ where: { id } });
      if (!existing) {
        return ErrorFactory.RepositoryError(`Order with ID ${id} not found`);
      }

      // Merge new values into the existing entity
      const updated = this.ormRepo.merge(existing, {
        ...updateOrderDto,
        updatedAt: new Date(),
      });

      await this.ormRepo.save(updated);
      return Result.success<IOrder>(updated);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to update the order`, error);
    }
  }

  async findById(id: string): Promise<Result<IOrder, RepositoryError>> {
    try {
      const order = await this.ormRepo.findOne({ where: { id } });
      if (!order) return ErrorFactory.RepositoryError('Order not found');

      return Result.success<IOrder>(order);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find the order`, error);
    }
  }

  async findAll(): Promise<Result<IOrder[], RepositoryError>> {
    try {
      const ordersList = await this.ormRepo.find();

      if (ordersList.length <= 0) {
        return ErrorFactory.RepositoryError('Did not find any orders');
      }
      return Result.success<IOrder[]>(ordersList);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find orders`, error);
    }
  }

  async deleteById(id: string): Promise<Result<void, RepositoryError>> {
    try {
      await this.ormRepo.delete(id);
      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to delete the order`, error);
    }
  }
}
