import { CustomerRepository } from '../../domain/repositories/customer.repository';
import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { Customer } from '../../domain/entities/customer';
import { ICustomer } from '../../domain/interfaces/customer.interface';

export class MockCustomerRepository implements CustomerRepository {
  // Jest mock functions
  findById = jest.fn<Promise<Result<Customer, RepositoryError>>, [number]>();
  findByEmail = jest.fn<Promise<Result<Customer, RepositoryError>>, [string]>();
  findByPhone = jest.fn<Promise<Result<Customer, RepositoryError>>, [string]>();
  findAll = jest.fn<
    Promise<Result<Customer[], RepositoryError>>,
    [number, number]
  >();
  save = jest.fn<Promise<Result<Customer, RepositoryError>>, [Customer]>();
  update = jest.fn<Promise<Result<Customer, RepositoryError>>, [Customer]>();
  delete = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();

  // Helper methods for common test scenarios
  mockSuccessfulFind(customerPrimitives: ICustomer): void {
    const domainCustomer = Customer.fromPrimitives(customerPrimitives as any);
    this.findById.mockResolvedValue(Result.success(domainCustomer));
    this.findByEmail.mockResolvedValue(Result.success(domainCustomer));
    if (customerPrimitives.phone) {
      this.findByPhone.mockResolvedValue(Result.success(domainCustomer));
    }
  }

  mockCustomerNotFound(): void {
    const error = new RepositoryError('Customer not found');
    this.findById.mockResolvedValue(Result.failure(error));
    this.findByEmail.mockResolvedValue(Result.failure(error));
    this.findByPhone.mockResolvedValue(Result.failure(error));
  }

  mockSuccessfulSave(customer: Customer): void {
    this.save.mockResolvedValue(Result.success(customer));
  }

  mockSaveFailure(errorMessage: string): void {
    this.save.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulDelete(): void {
    this.delete.mockResolvedValue(Result.success(undefined));
  }

  mockDeleteFailure(errorMessage: string): void {
    this.delete.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  // Reset all mocks
  reset(): void {
    jest.clearAllMocks();
  }

  // Verify no unexpected calls were made
  verifyNoUnexpectedCalls(): void {
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.findByEmail).not.toHaveBeenCalled();
    expect(this.findByPhone).not.toHaveBeenCalled();
    expect(this.findAll).not.toHaveBeenCalled();
    expect(this.save).not.toHaveBeenCalled();
    expect(this.update).not.toHaveBeenCalled();
    expect(this.delete).not.toHaveBeenCalled();
  }
}
