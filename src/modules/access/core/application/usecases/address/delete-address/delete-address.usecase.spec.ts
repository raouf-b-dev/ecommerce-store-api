import { DeleteAddressUseCase } from './delete-address.usecase';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../../shared-kernel/domain/exceptions/repository.error';
import { DomainError } from '../../../../../../../shared-kernel/domain/exceptions/domain.error';
import {
  createUserCallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { MockUserRepository } from 'src/modules/access/testing/mocks/user-repository.mock';
import { UserTestFactory } from 'src/modules/access/testing/factories/user.factory';
import { User } from '../../../../domain/entities/user';

const adminCallerContext = createUserCallerContext({
  userId: 1,
  role: 'ADMIN',
  permissions: new Set(['manage_customers']),
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

describe('DeleteAddressUseCase', () => {
  let useCase: DeleteAddressUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    useCase = new DeleteAddressUseCase(mockUserRepository);
  });

  afterEach(() => {
    mockUserRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if address is deleted', async () => {
      const userId = 123;
      const addressId = 123;
      const mockUserData = UserTestFactory.createUserWithAddress({
        id: userId,
      });
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.mockSuccessfulFind(mockUserData);
      mockUserRepository.update.mockResolvedValue(Result.success(undefined));

      const result = await useCase.execute({
        userId,
        addressId,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(RepositoryError) if user not found', async () => {
      const userId = 0;
      const addressId = 123;

      mockUserRepository.mockCustomerNotFound();

      const result = await useCase.execute({
        userId,
        addressId,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `User not found`,
        RepositoryError,
      );
    });

    it('should return Failure(DomainError) if address not found', async () => {
      const userId = 123;
      const addressId = 0;

      mockUserRepository.mockSuccessfulFind(
        UserTestFactory.createMockUser({ id: userId }),
      );

      const result = await useCase.execute({
        userId,
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
      const userId = 123;
      const addressId = 123;

      mockUserRepository.mockSuccessfulFind(
        UserTestFactory.createUserWithAddress({ id: userId }),
      );
      mockUserRepository.update.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to update user'),
      );

      const result = await useCase.execute({
        userId,
        addressId,
        callerContext: adminCallerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update user',
        RepositoryError,
      );
    });

    it('should allow user to delete own address', async () => {
      const userId = 123;
      const addressId = 123;
      const mockUserData = UserTestFactory.createUserWithAddress({
        id: userId,
      });
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.mockSuccessfulFind(mockUserData);
      mockUserRepository.update.mockResolvedValue(Result.success(undefined));

      const result = await useCase.execute({
        userId,
        addressId,
        callerContext: ownUserContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should deny user trying to delete address of another user', async () => {
      const userId = 123;
      const addressId = 123;

      const result = await useCase.execute({
        userId,
        addressId,
        callerContext: otherUserContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'User with id 123 not found',
        UseCaseError,
      );
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should allow system caller to delete address', async () => {
      const userId = 123;
      const addressId = 123;
      const mockUserData = UserTestFactory.createUserWithAddress({
        id: userId,
      });
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.mockSuccessfulFind(mockUserData);
      mockUserRepository.update.mockResolvedValue(Result.success(undefined));

      const result = await useCase.execute({
        userId,
        addressId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });
  });
});
