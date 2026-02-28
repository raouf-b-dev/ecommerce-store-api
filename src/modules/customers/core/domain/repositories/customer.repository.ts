// src/modules/customers/domain/interfaces/customer.repository.interface.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Customer } from '../entities/customer';

export abstract class CustomerRepository {
  abstract findById(id: number): Promise<Result<Customer, RepositoryError>>;
  abstract findByEmail(
    email: string,
  ): Promise<Result<Customer, RepositoryError>>;
  abstract findByPhone(
    phone: string,
  ): Promise<Result<Customer, RepositoryError>>;
  abstract findAll(
    page: number,
    limit: number,
  ): Promise<Result<Customer[], RepositoryError>>;
  abstract save(customer: Customer): Promise<Result<Customer, RepositoryError>>;
  abstract update(
    customer: Customer,
  ): Promise<Result<Customer, RepositoryError>>;
  abstract delete(id: number): Promise<Result<void, RepositoryError>>;
}
