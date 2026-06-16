import { AddAddressUseCase, AddAddressCommand } from './add-address.usecase';
import { MockCustomerRepository } from '../../../../testing/mocks/customer-repository.mock';
import { CustomerTestFactory } from '../../../../testing/factories/customer.factory';
import { CustomerCommandTestFactory } from '../../../../testing/factories/customer-dto.test.factory';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Customer } from '../../../domain/entities/customer';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { AddressType } from '../../../domain/value-objects/address-type';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
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

describe('AddAddressUseCase', () => {
  let useCase: AddAddressUseCase;
  let mockCustomerRepository: MockCustomerRepository;

  beforeEach(() => {
    mockCustomerRepository = new MockCustomerRepository();
    useCase = new AddAddressUseCase(mockCustomerRepository);
  });

  afterEach(() => {
    mockCustomerRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if address is added', async () => {
      const customerId = 123;
      const command: AddAddressCommand =
        CustomerCommandTestFactory.createAddAddressCommand();
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData);

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({
        customerId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.street).toBe(command.street);
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(customerId);
      expect(mockCustomerRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should add home address', async () => {
      const customerId = 123;
      const command: AddAddressCommand =
        CustomerCommandTestFactory.createAddAddressCommand({
          type: AddressType.HOME,
        });
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData);

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({
        customerId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should add work address', async () => {
      const customerId = 123;
      const command: AddAddressCommand =
        CustomerCommandTestFactory.createAddAddressCommand({
          type: AddressType.WORK,
        });
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData);

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({
        customerId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should add address with delivery instructions', async () => {
      const customerId = 123;
      const command: AddAddressCommand =
        CustomerCommandTestFactory.createAddAddressCommand({
          deliveryInstructions: 'Leave at front door',
        });
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData);

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({
        customerId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return Failure(RepositoryError) if customer not found', async () => {
      const customerId = 0;
      const command: AddAddressCommand =
        CustomerCommandTestFactory.createAddAddressCommand();

      mockCustomerRepository.mockCustomerNotFound();

      const result = await useCase.execute({
        customerId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Customer not found`,
        RepositoryError,
      );
    });

    it('should return Failure(RepositoryError) if update fails', async () => {
      const customerId = 123;
      const command: AddAddressCommand =
        CustomerCommandTestFactory.createAddAddressCommand();

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to update customer'),
      );

      const result = await useCase.execute({
        customerId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update customer',
        RepositoryError,
      );
    });

    it('should allow customer to add own address', async () => {
      const customerId = 123;
      const command: AddAddressCommand =
        CustomerCommandTestFactory.createAddAddressCommand();
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData);

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({
        customerId,
        command,
        callerContext: ownCustomerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should deny customer trying to add address to another customer', async () => {
      const customerId = 123;
      const command: AddAddressCommand =
        CustomerCommandTestFactory.createAddAddressCommand();

      const result = await useCase.execute({
        customerId,
        command,
        callerContext: otherCustomerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Customer with id 123 not found',
        UseCaseError,
      );
      expect(mockCustomerRepository.findById).not.toHaveBeenCalled();
    });

    it('should allow system caller to add address', async () => {
      const customerId = 123;
      const command: AddAddressCommand =
        CustomerCommandTestFactory.createAddAddressCommand();
      const mockCustomerData = CustomerTestFactory.createCustomerWithAddress({
        id: customerId,
      });
      const mockCustomer = Customer.fromPrimitives(mockCustomerData);

      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );
      mockCustomerRepository.update.mockResolvedValue(
        Result.success(mockCustomer),
      );

      const result = await useCase.execute({
        customerId,
        command,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });
  });
});
