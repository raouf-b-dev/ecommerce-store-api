import { DeleteUserUseCase } from './delete-user.usecase';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../../shared-kernel/domain/exceptions/repository.error';
import { MockUserRepository } from '../../../../../testing/mocks/user-repository.mock';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    useCase = new DeleteUserUseCase(mockUserRepository);
  });

  afterEach(() => {
    mockUserRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if user is deleted', async () => {
      const userId = 123;

      mockUserRepository.delete.mockResolvedValue(Result.success(undefined));

      const result = await useCase.execute(userId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
    });

    it('should return Failure(UseCaseError) if deletion fails', async () => {
      const userId = 123;

      mockUserRepository.delete.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to delete user'),
      );

      const result = await useCase.execute(userId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to delete user',
        RepositoryError,
      );
    });
  });
});
