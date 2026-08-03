import { AddAddressUseCase, AddAddressCommand } from './add-address.usecase';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import { AddressType } from '../../../../../../../shared-kernel/domain/value-objects/address-type';
import { RepositoryError } from '../../../../../../../shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import {
  createUserCallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { MockUserRepository } from '../../../../../testing/mocks/user-repository.mock';
import { AddressTestFactory } from '../../../../../testing/factories/address.entity.factory';
import { UserTestFactory } from '../../../../../testing/factories/user.factory';

/** Use a street distinct from the default mock address ('123 Main St') to avoid duplicate-address errors */
const newAddressCommand = (): AddAddressCommand =>
  AddressTestFactory.createAddAddressCommand({ street: '999 New Ave' });

const adminCallerContext = createUserCallerContext({
  userId: 1,
  role: 'ADMIN',
  permissions: new Set(['manage_users']),
});

const ownCustomerContext = createUserCallerContext({
  userId: 123,
  role: 'CUSTOMER',
  permissions: new Set(['manage_own_addresses']),
});

const otherCustomerContext = createUserCallerContext({
  userId: 3,
  role: 'CUSTOMER',
  permissions: new Set(['manage_own_addresses']),
});

describe('AddAddressUseCase', () => {
  let useCase: AddAddressUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    useCase = new AddAddressUseCase(mockUserRepository);
  });

  afterEach(() => {
    mockUserRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if address is added', async () => {
      const userId = 123;
      const command: AddAddressCommand = newAddressCommand();
      const mockUserData = UserTestFactory.createMockUser({ id: userId });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        userId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockUserRepository.findByIdForUpdate).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should add home address', async () => {
      const userId = 123;
      const command: AddAddressCommand =
        AddressTestFactory.createAddAddressCommand({
          street: '999 New Ave',
          type: AddressType.HOME,
        });
      const mockUserData = UserTestFactory.createMockUser({ id: userId });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        userId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should add work address', async () => {
      const userId = 123;
      const command: AddAddressCommand =
        AddressTestFactory.createAddAddressCommand({
          street: '999 New Ave',
          type: AddressType.WORK,
        });
      const mockUserData = UserTestFactory.createMockUser({ id: userId });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        userId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should add address with delivery instructions', async () => {
      const userId = 123;
      const command: AddAddressCommand =
        AddressTestFactory.createAddAddressCommand({
          street: '999 New Ave',
          deliveryInstructions: 'Leave at front door',
        });
      const mockUserData = UserTestFactory.createMockUser({ id: userId });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        userId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return Failure(UseCaseError) if user not found', async () => {
      const userId = 999;
      const command: AddAddressCommand =
        AddressTestFactory.createAddAddressCommand();

      mockUserRepository.mockUserNotFound();

      const result = await useCase.execute({
        userId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `User not found`,
        UseCaseError,
      );
    });

    it('should return Failure(RepositoryError) if repository fails', async () => {
      const userId = 123;
      const command: AddAddressCommand =
        AddressTestFactory.createAddAddressCommand();

      mockUserRepository.findByIdForUpdate.mockResolvedValue(
        Result.failure(new RepositoryError('DB error')),
      );

      const result = await useCase.execute({
        userId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'DB error',
        RepositoryError,
      );
    });

    it('should return Failure(RepositoryError) if save fails', async () => {
      const userId = 123;
      const command: AddAddressCommand = newAddressCommand();
      const mockUserData = UserTestFactory.createMockUser({ id: userId });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSaveFailure('Failed to update user');

      const result = await useCase.execute({
        userId,
        command,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update user',
        RepositoryError,
      );
    });

    it('should allow customer to add own address', async () => {
      const userId = 123;
      const command: AddAddressCommand = newAddressCommand();
      const mockUserData = UserTestFactory.createMockUser({ id: userId });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        userId,
        command,
        callerContext: ownCustomerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should deny customer trying to add address to another customer', async () => {
      const userId = 123;
      const command: AddAddressCommand =
        AddressTestFactory.createAddAddressCommand();

      const result = await useCase.execute({
        userId,
        command,
        callerContext: otherCustomerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'User with id 123 not found',
        UseCaseError,
      );
      expect(mockUserRepository.findByIdForUpdate).not.toHaveBeenCalled();
    });

    it('should allow system caller to add address', async () => {
      const userId = 123;
      const command: AddAddressCommand = newAddressCommand();
      const mockUserData = UserTestFactory.createMockUser({ id: userId });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        userId,
        command,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });
  });
});
