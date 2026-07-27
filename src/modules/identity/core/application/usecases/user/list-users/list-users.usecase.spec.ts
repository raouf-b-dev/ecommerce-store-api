import { ListUsersUseCase, ListUsersQuery } from './list-users.usecase';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../../shared-kernel/domain/exceptions/repository.error';
import { MockUserRepository } from '../../../../../testing/mocks/user-repository.mock';

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    useCase = new ListUsersUseCase(mockUserRepository);
  });

  afterEach(() => {
    mockUserRepository.reset();
  });

  describe('execute', () => {
    it('should return Success with paginated users', async () => {
      const query: ListUsersQuery = { limit: 10, page: 1 };

      mockUserRepository.findAll.mockResolvedValue(Result.success([]));

      const result = await useCase.execute(query);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockUserRepository.findAll).toHaveBeenCalledWith(
        query.page,
        query.limit,
      );
    });

    it('should return Success with empty list if no users found', async () => {
      const query: ListUsersQuery = { limit: 10, page: 0 };

      mockUserRepository.findAll.mockResolvedValue(Result.success([]));

      const result = await useCase.execute(query);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toHaveLength(0);
    });

    it('should return Failure(UseCaseError) if repository fails', async () => {
      const query: ListUsersQuery = { limit: 10, page: 0 };

      mockUserRepository.findAll.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to fetch users'),
      );

      const result = await useCase.execute(query);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to fetch users',
        RepositoryError,
      );
    });
  });
});
