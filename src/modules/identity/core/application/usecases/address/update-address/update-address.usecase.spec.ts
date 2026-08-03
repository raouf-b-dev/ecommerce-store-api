import {
  UpdateAddressUseCase,
  UpdateAddressCommand,
} from './update-address.usecase';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { RepositoryError } from '../../../../../../../shared-kernel/domain/exceptions/repository.error';
import {
  createUserCallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { MockUserRepository } from '../../../../../testing/mocks/user-repository.mock';
import { UserTestFactory } from '../../../../../testing/factories/user.factory';
import { AddressTestFactory } from '../../../../../testing/factories/address.entity.factory';
import { DomainError } from 'src/shared-kernel/domain/exceptions/domain.error';

const adminCallerContext = createUserCallerContext({
  userId: 1,
  role: 'ADMIN',
  permissions: new Set(['manage_users']),
});

const ownUserContext = createUserCallerContext({
  userId: 123,
  role: 'CUSTOMER',
  permissions: new Set(['manage_own_addresses']),
});

const otherUserContext = createUserCallerContext({
  userId: 3,
  role: 'CUSTOMER',
  permissions: new Set(['manage_own_addresses']),
});

describe('UpdateAddressUseCase', () => {
  let useCase: UpdateAddressUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    useCase = new UpdateAddressUseCase(mockUserRepository);
  });

  afterEach(() => {
    mockUserRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if address is updated', async () => {
      const userId = 123;
      const addressId = 123;
      const updateDto: UpdateAddressCommand =
        AddressTestFactory.createUpdateAddressCommand();
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        userId,
        addressId,
        command: updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockUserRepository.findByIdForUpdate).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if user not found', async () => {
      const userId = 999;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand();

      mockUserRepository.mockUserNotFound();

      const result = await useCase.execute({
        userId,
        addressId,
        command: updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `User with id ${userId} not found`,
        UseCaseError,
      );
    });

    it('should return Failure(UseCaseError) if address not found', async () => {
      const userId = 123;
      const addressId = 999;
      const updateDto = AddressTestFactory.createUpdateAddressCommand();
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);

      const result = await useCase.execute({
        userId,
        addressId,
        command: updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Address with id ${addressId} not found`,
        DomainError,
      );
    });

    it('should return Failure(RepositoryError) if save fails', async () => {
      const userId = 123;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand();
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSaveFailure('Failed to update user');

      const result = await useCase.execute({
        userId,
        addressId,
        command: updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update user',
        RepositoryError,
      );
    });

    it('should allow user to update own address', async () => {
      const userId = 123;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand();
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        userId,
        addressId,
        command: updateDto,
        callerContext: ownUserContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should deny user trying to update address of another user', async () => {
      const userId = 123;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand();

      const result = await useCase.execute({
        userId,
        addressId,
        command: updateDto,
        callerContext: otherUserContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'User with id 123 not found',
        UseCaseError,
      );
      expect(mockUserRepository.findByIdForUpdate).not.toHaveBeenCalled();
    });

    it('should allow system caller to update address', async () => {
      const userId = 123;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand();
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        userId,
        addressId,
        command: updateDto,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });
  });
});
