import { ActivateUserUseCase } from './activate-user.usecase';
import { MockUserRepository } from '../../../../../testing/mocks/user-repository.mock';
import { UserTestFactory } from '../../../../../testing/factories/user.factory';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DomainError } from '../../../../../../../shared-kernel/domain/exceptions/domain.error';

describe('ActivateUserUseCase', () => {
  let usecase: ActivateUserUseCase;
  let userRepository: MockUserRepository;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    usecase = new ActivateUserUseCase(userRepository);
  });

  it('should activate a deactivated user', async () => {
    const userData = UserTestFactory.createMockUser({ isActive: false });
    userRepository.mockSuccessfulFindByIdForUpdate(userData);
    userRepository.mockSuccessfulSave();

    const result = await usecase.execute(1);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(userRepository.save).toHaveBeenCalled();
  });

  it('should return failure if user is already active', async () => {
    const userData = UserTestFactory.createMockUser({ isActive: true });
    userRepository.mockSuccessfulFindByIdForUpdate(userData);

    const result = await usecase.execute(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User is already active',
      DomainError,
    );
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('should return failure if user not found', async () => {
    userRepository.mockUserNotFound();

    const result = await usecase.execute(999);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User not found',
      UseCaseError,
    );
  });
});
