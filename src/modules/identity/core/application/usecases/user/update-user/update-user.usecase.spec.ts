import { UpdateUserUseCase, UpdateUserCommand } from './update-user.usecase';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { RepositoryError } from '../../../../../../../shared-kernel/domain/exceptions/repository.error';
import { MockUserRepository } from '../../../../../testing/mocks/user-repository.mock';
import { UserTestFactory } from '../../../../../testing/factories/user.factory';
import { User } from '../../../../domain/entities/user';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    useCase = new UpdateUserUseCase(mockUserRepository);
  });

  afterEach(() => {
    mockUserRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if user is updated', async () => {
      const userId = 123;
      const updateDto: UpdateUserCommand = {
        firstName: 'Jane',
        lastName: 'Smith',
      };
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.findById.mockResolvedValue(Result.success(mockUser));
      mockUserRepository.update.mockResolvedValue(Result.success(undefined));

      const result = await useCase.execute({
        id: userId,
        command: updateDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if user is not found', async () => {
      const userId = 999;
      const updateDto: UpdateUserCommand = {
        firstName: 'Jane',
      };

      mockUserRepository.findById.mockResolvedValue(Result.success(null));

      const result = await useCase.execute({
        id: userId,
        command: updateDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'User not found',
        UseCaseError,
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should return Failure(RepositoryError) if repository update fails', async () => {
      const userId = 123;
      const updateDto: UpdateUserCommand = {
        firstName: 'Jane',
      };
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });
      const mockUser = User.fromProps(mockUserData);

      mockUserRepository.findById.mockResolvedValue(Result.success(mockUser));
      mockUserRepository.update.mockResolvedValue(
        ErrorFactory.RepositoryError('Failed to update user'),
      );

      const result = await useCase.execute({
        id: userId,
        command: updateDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update user',
        RepositoryError,
      );
    });
  });
});
