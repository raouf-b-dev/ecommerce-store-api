import { UpdateAddressUseCase } from './update-address.usecase';
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
import { Result } from '../../../../../../../shared-kernel/domain/result';

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
      const updateDto = AddressTestFactory.createUpdateAddressCommand({
        userId,
        addressId,
      });
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        ...updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockUserRepository.findByIdForUpdate).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if user not found', async () => {
      const userId = 999;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand({
        userId,
        addressId,
      });

      mockUserRepository.mockUserNotFound();

      const result = await useCase.execute({
        ...updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `User with id ${userId} not found`,
        UseCaseError,
      );

      expect(mockUserRepository.findByIdForUpdate).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure(RepositoryError) if repository findByIdForUpdate fails', async () => {
      const userId = 123;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand({
        userId,
        addressId,
      });

      mockUserRepository.findByIdForUpdate.mockResolvedValue(
        Result.failure(new RepositoryError('Database connection error')),
      );

      const result = await useCase.execute({
        ...updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database connection error',
        RepositoryError,
      );

      expect(mockUserRepository.findByIdForUpdate).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure(RepositoryError) if repository save fails', async () => {
      const userId = 123;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand({
        userId,
        addressId,
      });
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSaveFailure('Failed to save address');

      const result = await useCase.execute({
        ...updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save address',
        RepositoryError,
      );

      expect(mockUserRepository.findByIdForUpdate).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should allow customer to update own address', async () => {
      const userId = 123;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand({
        userId,
        addressId,
      });
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        ...updateDto,
        callerContext: ownUserContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should deny customer trying to update another customer address', async () => {
      const userId = 123;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand({
        userId,
        addressId,
      });

      const result = await useCase.execute({
        ...updateDto,
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
      const updateDto = AddressTestFactory.createUpdateAddressCommand({
        userId,
        addressId,
      });
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute({
        ...updateDto,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });
  });
});
