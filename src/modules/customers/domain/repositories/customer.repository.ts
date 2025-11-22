// src/modules/customers/domain/interfaces/customer.repository.interface.ts
import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { Customer } from '../entities/customer';

export abstract class CustomerRepository {
  abstract findById(id: string): Promise<Result<Customer, RepositoryError>>;
  abstract findByEmail(
    email: string,
  ): Promise<Result<Customer, RepositoryError>>;
  abstract findByPhone(
    phone: string,
  ): Promise<Result<Customer, RepositoryError>>;
  abstract findAll(
    page: number,
    limit: number,
  ): Promise<Result<{ items: Customer[]; total: number }, RepositoryError>>;
  abstract save(customer: Customer): Promise<Result<Customer, RepositoryError>>;
  abstract update(
    customer: Customer,
  ): Promise<Result<Customer, RepositoryError>>;
  abstract delete(id: string): Promise<Result<void, RepositoryError>>;
}
