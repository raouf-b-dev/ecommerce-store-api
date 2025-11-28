import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Customer } from '../../../domain/entities/customer';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { CustomerEntity } from '../../orm/customer.schema';
import { CustomerMapper } from '../../persistence/mappers/customer.mapper';

@Injectable()
export class PostgresCustomerRepository implements CustomerRepository {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly repository: Repository<CustomerEntity>,
  ) {}

  async findById(id: string): Promise<Result<Customer, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({
        where: { id },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Customer not found');
      }

      return Result.success(CustomerMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find customer', error);
    }
  }

  async findByEmail(email: string): Promise<Result<Customer, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({
        where: { email },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Customer not found');
      }

      return Result.success(CustomerMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find customer by email',
        error,
      );
    }
  }

  async findByPhone(phone: string): Promise<Result<Customer, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({
        where: { phone },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Customer not found');
      }

      return Result.success(CustomerMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find customer by phone',
        error,
      );
    }
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<Result<{ items: Customer[]; total: number }, RepositoryError>> {
    try {
      const [entities, total] = await this.repository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        order: { createdAt: 'DESC' },
      });

      const items = entities.map((entity) => CustomerMapper.toDomain(entity));

      return Result.success({ items, total });
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find customers', error);
    }
  }

  async save(customer: Customer): Promise<Result<Customer, RepositoryError>> {
    try {
      const entity = CustomerMapper.toEntity(customer);
      const savedEntity = await this.repository.save(entity);
      return Result.success(CustomerMapper.toDomain(savedEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save customer', error);
    }
  }

  async update(customer: Customer): Promise<Result<Customer, RepositoryError>> {
    try {
      const entity = CustomerMapper.toEntity(customer);
      const savedEntity = await this.repository.save(entity);
      return Result.success(CustomerMapper.toDomain(savedEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to update customer', error);
    }
  }

  async delete(id: string): Promise<Result<void, RepositoryError>> {
    try {
      const result = await this.repository.delete(id);
      if (result.affected === 0) {
        return ErrorFactory.RepositoryError('Customer not found');
      }
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete customer', error);
    }
  }
}
