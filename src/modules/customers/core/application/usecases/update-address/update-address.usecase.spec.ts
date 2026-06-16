import {
  UpdateAddressUseCase,
  UpdateAddressCommand,
} from './update-address.usecase';
import { MockCustomerRepository } from '../../../../testing/mocks/customer-repository.mock';
import { CustomerTestFactory } from '../../../../testing/factories/customer.factory';
import { CustomerCommandTestFactory } from '../../../../testing/factories/customer-dto.test.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Customer } from '../../../domain/entities/customer';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
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

describe('UpdateAddressUseCase', () => {
  let useCase: UpdateAddressUseCase;
  let mockCustomerRepository: MockCustomerRepository;

  beforeEach(() => {
    mockCustomerRepository = new MockCustomerRepository();
    useCase = new UpdateAddressUseCase(mockCustomerRepository);
  });

  afterEach(() => {
    mockCustomerRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if address is updated', async () => {
      const customerId = 123;
      const addressId = 123;
      const updateDto: UpdateAddressCommand =
        CustomerCommandTestFactory.createUpdateAddressCommand();
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
        command: updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(customerId);
      expect(mockCustomerRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(RepositoryError) if customer not found', async () => {
      const customerId = 0;
      const addressId = 123;
      const updateDto = CustomerCommandTestFactory.createUpdateAddressCommand();

      mockCustomerRepository.mockCustomerNotFound();

      const result = await useCase.execute({
        customerId,
        addressId,
        command: updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Customer not found`,
        RepositoryError,
      );
    });

    it('should return Failure(UseCaseError) if address not found', async () => {
      const customerId = 123;
      const addressId = 0;
      const updateDto = CustomerCommandTestFactory.createUpdateAddressCommand();

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );

      const result = await useCase.execute({
        customerId,
        addressId,
        command: updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Address with id ${addressId} not found`,
        UseCaseError,
      );
    });

    it('should return Failure(UseCaseError) if update fails', async () => {
      const customerId = 123;
      const addressId = 123;
      const updateDto = CustomerCommandTestFactory.createUpdateAddressCommand();

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createCustomerWithAddress({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to update customer'),
      );

      const result = await useCase.execute({
        customerId,
        addressId,
        command: updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update customer',
        RepositoryError,
      );
    });

    it('should allow customer to update own address', async () => {
      const customerId = 123;
      const addressId = 123;
      const updateDto = CustomerCommandTestFactory.createUpdateAddressCommand();
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
        command: updateDto,
        callerContext: ownCustomerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should deny customer trying to update address of another customer', async () => {
      const customerId = 123;
      const addressId = 123;
      const updateDto = CustomerCommandTestFactory.createUpdateAddressCommand();

      const result = await useCase.execute({
        customerId,
        addressId,
        command: updateDto,
        callerContext: otherCustomerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Customer with id 123 not found',
        UseCaseError,
      );
      expect(mockCustomerRepository.findById).not.toHaveBeenCalled();
    });

    it('should allow system caller to update address', async () => {
      const customerId = 123;
      const addressId = 123;
      const updateDto = CustomerCommandTestFactory.createUpdateAddressCommand();
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
        command: updateDto,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });
  });
});
