import { ActivateUserUseCase } from './activate-user.usecase';
import { MockUserRepository } from '../../../../testing/mocks/user-repository.mock';
import { User } from '../../../domain/entities/user';
import { UserTestFactory } from '../../../../testing/factories/user.factory';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';

describe('ActivateUserUseCase', () => {
  let usecase: ActivateUserUseCase;
  let userRepository: MockUserRepository;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    usecase = new ActivateUserUseCase(userRepository);
  });

  it('should activate a deactivated user', async () => {
    const user = User.fromPrimitives(
      UserTestFactory.createMockUser({ isActive: false }),
    );
    userRepository.findById.mockResolvedValue(Result.success(user));
    userRepository.save.mockResolvedValue(Result.success(user));

    const result = await usecase.execute(1);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(user.isActive).toBe(true);
    expect(userRepository.save).toHaveBeenCalledWith(user);
  });

  it('should return failure if user is already active', async () => {
    const user = User.fromPrimitives(
      UserTestFactory.createMockUser({ isActive: true }),
    );
    userRepository.findById.mockResolvedValue(Result.success(user));

    const result = await usecase.execute(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User is already active',
      DomainError,
    );
    expect(userRepository.save).not.toHaveBeenCalled();
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
