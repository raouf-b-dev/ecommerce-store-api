import { GetCustomerUseCase } from './get-customer.usecase';
import { MockCustomerRepository } from '../../../../testing/mocks/customer-repository.mock';
import { CustomerTestFactory } from '../../../../testing/factories/customer.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import {
  createUserCallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('GetCustomerUseCase', () => {
  let useCase: GetCustomerUseCase;
  let mockCustomerRepository: MockCustomerRepository;

  const ownCustomerContext = createUserCallerContext({
    userId: 2,
    customerId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_profile']),
  });

  const otherCustomerContext = createUserCallerContext({
    userId: 3,
    customerId: 456,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_profile']),
  });

  const adminContext = createUserCallerContext({
    userId: 1,
    customerId: null,
    role: 'ADMIN',
    permissions: new Set(['view_all_customers']),
  });

  beforeEach(() => {
    mockCustomerRepository = new MockCustomerRepository();
    useCase = new GetCustomerUseCase(mockCustomerRepository);
  });

  afterEach(() => {
    mockCustomerRepository.reset();
  });

  describe('execute', () => {
    it('should return Success with customer if found and caller owns profile', async () => {
      const customerId = 123;
      const mockCustomerData = CustomerTestFactory.createMockCustomer({
        id: customerId,
      });

      mockCustomerRepository.mockSuccessfulFind(mockCustomerData);

      const result = await useCase.execute({
        customerId,
        callerContext: ownCustomerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(customerId);
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(customerId);
    });

    it('should allow admin to view any customer', async () => {
      const customerId = 999;
      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );

      const result = await useCase.execute({
        customerId,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should deny access when customer views another profile', async () => {
      const result = await useCase.execute({
        customerId: 123,
        callerContext: otherCustomerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Customer with id 123 not found',
        UseCaseError,
      );
      expect(mockCustomerRepository.findById).not.toHaveBeenCalled();
    });

    it('should allow system caller', async () => {
      const customerId = 123;
      mockCustomerRepository.mockSuccessfulFind(
        CustomerTestFactory.createMockCustomer({ id: customerId }),
      );

      const result = await useCase.execute({
        customerId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return Failure(RepositoryError) if customer not found', async () => {
      const customerId = 0;

      mockCustomerRepository.mockCustomerNotFound();

      const result = await useCase.execute({
        customerId,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Customer not found`,
        RepositoryError,
      );
    });
  });
});
