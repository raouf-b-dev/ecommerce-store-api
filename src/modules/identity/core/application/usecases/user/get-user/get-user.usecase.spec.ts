import { GetUserUseCase } from './get-user.usecase';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import {
  createUserCallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { MockUserRepository } from '../../../../../testing/mocks/user-repository.mock';
import { UserTestFactory } from '../../../../../testing/factories/user.factory';
import { User } from '../../../../domain/entities/user';

describe('GetUserUseCase', () => {
  let useCase: GetUserUseCase;
  let mockUserRepository: MockUserRepository;

  const ownUserContext = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_profile']),
  });

  const otherCustomerContext = createUserCallerContext({
    userId: 3,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_profile']),
  });

  const adminContext = createUserCallerContext({
    userId: 1,
    role: 'ADMIN',
    permissions: new Set(['view_all_users']),
  });

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    useCase = new GetUserUseCase(mockUserRepository);
  });

  afterEach(() => {
    mockUserRepository.reset();
  });

  describe('execute', () => {
    it('should return Success with user if found and caller owns profile', async () => {
      const userId = 2;
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.findById.mockResolvedValue(Result.success(mockUser));

      const result = await useCase.execute({
        userId,
        callerContext: ownUserContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(userId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should allow admin to view any user', async () => {
      const userId = 999;
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.findById.mockResolvedValue(Result.success(mockUser));

      const result = await useCase.execute({
        userId,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(userId);
    });

    it('should deny access when user views another profile', async () => {
      const result = await useCase.execute({
        userId: 123,
        callerContext: otherCustomerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'User with id 123 not found',
        UseCaseError,
      );
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should allow system caller', async () => {
      const userId = 123;
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.findById.mockResolvedValue(Result.success(mockUser));

      const result = await useCase.execute({
        userId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return Failure(UseCaseError) if user is not found in repository', async () => {
      const userId = 123;

      mockUserRepository.findById.mockResolvedValue(Result.success(null));

      const result = await useCase.execute({
        userId,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'User with id 123 not found',
        UseCaseError,
      );
    });
  });
});
