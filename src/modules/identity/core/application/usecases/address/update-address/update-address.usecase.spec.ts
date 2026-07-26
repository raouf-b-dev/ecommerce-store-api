import {
  UpdateAddressUseCase,
  UpdateAddressCommand,
} from './update-address.usecase';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../../shared-kernel/domain/exceptions/repository.error';
import {
  createUserCallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { MockUserRepository } from '../../../../../testing/mocks/user-repository.mock';
import { UserTestFactory } from '../../../../../testing/factories/user.factory';
import { AddressTestFactory } from '../../../../../testing/factories/address.entity.factory';
import { User } from '../../../../domain/entities/user';
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
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.findById.mockResolvedValue(Result.success(mockUser));
      mockUserRepository.update.mockResolvedValue(Result.success(undefined));

      const result = await useCase.execute({
        userId,
        addressId,
        command: updateDto,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if user not found', async () => {
      const userId = 999;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand();

      mockUserRepository.findById.mockResolvedValue(Result.success(null));

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
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.findById.mockResolvedValue(Result.success(mockUser));

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

    it('should return Failure(RepositoryError) if update fails', async () => {
      const userId = 123;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand();
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.findById.mockResolvedValue(Result.success(mockUser));
      mockUserRepository.update.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to update user'),
      );

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
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.findById.mockResolvedValue(Result.success(mockUser));
      mockUserRepository.update.mockResolvedValue(Result.success(undefined));

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
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should allow system caller to update address', async () => {
      const userId = 123;
      const addressId = 123;
      const updateDto = AddressTestFactory.createUpdateAddressCommand();
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.findById.mockResolvedValue(Result.success(mockUser));
      mockUserRepository.update.mockResolvedValue(Result.success(undefined));

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
