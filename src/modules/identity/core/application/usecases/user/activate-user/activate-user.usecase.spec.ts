import {
  MockUserRepository,
  UserTestFactory,
} from 'src/modules/identity/testing';
import { ActivateUserUseCase } from './activate-user.usecase';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DomainError } from '../../../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorCode } from '../../../../../../../shared-kernel/domain/exceptions/error-code';
import { ErrorKind } from '../../../../../../../shared-kernel/domain/exceptions/error-kind';

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
      'User with id 999 not found',
      UseCaseError,
    );
    expect(result.error.code).toBe(ErrorCode.USER_NOT_FOUND);
    expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
  });
});
