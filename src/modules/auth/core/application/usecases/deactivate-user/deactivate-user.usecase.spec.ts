import { DeactivateUserUseCase } from './deactivate-user.usecase';
import { MockUserRepository } from '../../../../testing/mocks/user-repository.mock';
import { MockSessionTokenRepository } from '../../../../testing/mocks/session-token-repository.mock';
import { User } from '../../../domain/entities/user';
import { UserTestFactory } from '../../../../testing/factories/user.factory';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';

describe('DeactivateUserUseCase', () => {
  let usecase: DeactivateUserUseCase;
  let userRepository: MockUserRepository;
  let sessionTokenRepository: MockSessionTokenRepository;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    sessionTokenRepository = new MockSessionTokenRepository();
    usecase = new DeactivateUserUseCase(userRepository, sessionTokenRepository);
  });

  it('should deactivate a user and revoke all sessions', async () => {
    const user = User.fromPrimitives(
      UserTestFactory.createMockUser({ isActive: true }),
    );
    userRepository.findById.mockResolvedValue(Result.success(user));
    userRepository.save.mockResolvedValue(Result.success(user));
    sessionTokenRepository.revokeAllForUser.mockResolvedValue(
      Result.success(undefined),
    );

    const result = await usecase.execute(1);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(user.isActive).toBe(false);
    expect(userRepository.save).toHaveBeenCalledWith(user);
    expect(sessionTokenRepository.revokeAllForUser).toHaveBeenCalledWith(1);
  });

  it('should return failure if user is already deactivated', async () => {
    const user = User.fromPrimitives(
      UserTestFactory.createMockUser({ isActive: false }),
    );
    userRepository.findById.mockResolvedValue(Result.success(user));

    const result = await usecase.execute(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User is already deactivated',
      DomainError,
    );
    expect(userRepository.save).not.toHaveBeenCalled();
    expect(sessionTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('should return failure if user not found', async () => {
    userRepository.findById.mockResolvedValue(Result.success(null));

    const result = await usecase.execute(999);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User not found',
      UseCaseError,
    );
  });
});
