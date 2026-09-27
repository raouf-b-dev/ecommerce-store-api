import {
  MockUserRepository,
  UserTestFactory,
} from 'src/modules/identity/testing';
import { UpdateUserUseCase } from './update-user.usecase';
import { UpdateUserCommand } from '../../../commands/update-user.command';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { RepositoryError } from '../../../../../../../shared-kernel/domain/exceptions/repository.error';

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
      const command: UpdateUserCommand = {
        id: userId,
        firstName: 'Jane',
        lastName: 'Smith',
      };
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSuccessfulSave();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockUserRepository.findByIdForUpdate).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if user is not found', async () => {
      const userId = 999;
      const command: UpdateUserCommand = {
        id: userId,
        firstName: 'Jane',
      };

      mockUserRepository.mockUserNotFound();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'User not found',
        UseCaseError,
      );
      expect(mockUserRepository.findByIdForUpdate).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure(RepositoryError) if repository save fails', async () => {
      const userId = 123;
      const command: UpdateUserCommand = {
        id: userId,
        firstName: 'Jane',
      };
      const mockUserData = UserTestFactory.createMockUser({
        id: userId,
      });

      mockUserRepository.mockSuccessfulFindByIdForUpdate(mockUserData);
      mockUserRepository.mockSaveFailure('Failed to update user');

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update user',
        RepositoryError,
      );
    });
  });
});
