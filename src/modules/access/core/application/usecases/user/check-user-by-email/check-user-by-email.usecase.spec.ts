import { CheckEmailExistsUseCase } from './check-user-by-email.usecase';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { RepositoryError } from '../../../../../../../shared-kernel/domain/exceptions/repository.error';
import { MockUserRepository } from 'src/modules/access/testing/mocks/user-repository.mock';
import { Result } from '../../../../../../../shared-kernel/domain/result';

describe('CheckEmailExistsUseCase', () => {
  let useCase: CheckEmailExistsUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    useCase = new CheckEmailExistsUseCase(mockUserRepository);
  });

  afterEach(() => {
    mockUserRepository.reset();
  });

  describe('execute', () => {
    it('should return Success with true if email exists', async () => {
      const email = 'existing@example.com';
      mockUserRepository.existsByEmail.mockResolvedValue(Result.success(true));

      const result = await useCase.execute(email);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(true);
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(email);
    });

    it('should return Success with false if email does not exist', async () => {
      const email = 'missing@example.com';
      mockUserRepository.existsByEmail.mockResolvedValue(Result.success(false));

      const result = await useCase.execute(email);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(false);
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(email);
    });

    it('should return Failure(RepositoryError) if repository fails', async () => {
      const email = 'error@example.com';
      const repoError = new RepositoryError('Database error');
      mockUserRepository.existsByEmail.mockResolvedValue(
        Result.failure(repoError),
      );

      const result = await useCase.execute(email);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database error',
        RepositoryError,
      );
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(email);
    });
  });
});
