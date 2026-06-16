import { SetDefaultAddressUseCase } from './set-default-address.usecase';
import { MockCustomerRepository } from '../../../../testing/mocks/customer-repository.mock';
import { CustomerTestFactory } from '../../../../testing/factories/customer.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Customer } from '../../../domain/entities/customer';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';
import {
  createUserCallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

const adminCallerContext = createUserCallerContext({
  userId: 1,
  customerId: null,
  role: 'ADMIN',
  permissions: new Set(['manage_customers']),
});

const ownCustomerContext = createUserCallerContext({
  userId: 2,
  customerId: 123,
  role: 'CUSTOMER',
  permissions: new Set(['manage_own_addresses']),
});

const otherCustomerContext = createUserCallerContext({
  userId: 3,
  customerId: 456,
  role: 'CUSTOMER',
  permissions: new Set(['manage_own_addresses']),
});

describe('SetDefaultAddressUseCase', () => {
  let useCase: SetDefaultAddressUseCase;
  let mockCustomerRepository: MockCustomerRepository;

  beforeEach(() => {
    mockCustomerRepository = new MockCustomerRepository();
    useCase = new SetDefaultAddressUseCase(mockCustomerRepository);
  });

  afterEach(() => {
    mockCustomerRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if address is set as default', async () => {
      const customerId = 123;
      const addressId = 123;
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData);

      mockCustomerRepository.mockSuccessfulFind(mockCustomerData);
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({
        customerId,
        addressId,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(customerId);
      expect(mockCustomerRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(RepositoryError) if customer not found', async () => {
      const customerId = 0;
      const addressId = 123;

      mockCustomerRepository.mockCustomerNotFound();

      const result = await useCase.execute({
        customerId,
        addressId,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Customer not found`,
        RepositoryError,
      );
    });

    it('should return Failure(DomainError) if address not found', async () => {
      const customerId = 123;
      const addressId = 0;

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );

      const result = await useCase.execute({
        customerId,
        addressId,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Address with ID ${addressId} not found`,
        DomainError,
      );
    });

    it('should return Failure(RepositoryError) if update fails', async () => {
      const customerId = 123;
      const addressId = 123;

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createCustomerWithAddress({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to update customer'),
      );

      const result = await useCase.execute({
        customerId,
        addressId,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update customer',
        RepositoryError,
      );
    });

    it('should allow customer to set own address as default', async () => {
      const customerId = 123;
      const addressId = 123;
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData);

      mockCustomerRepository.mockSuccessfulFind(mockCustomerData);
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({
        customerId,
        addressId,
        callerContext: ownCustomerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should deny customer trying to set address of another customer as default', async () => {
      const customerId = 123;
      const addressId = 123;

      const result = await useCase.execute({
        customerId,
        addressId,
        callerContext: otherCustomerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Customer with id 123 not found',
        UseCaseError,
      );
      expect(mockCustomerRepository.findById).not.toHaveBeenCalled();
    });

    it('should allow system caller to set address as default', async () => {
      const customerId = 123;
      const addressId = 123;
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData);

      mockCustomerRepository.mockSuccessfulFind(mockCustomerData);
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({
        customerId,
        addressId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });
  });
});
