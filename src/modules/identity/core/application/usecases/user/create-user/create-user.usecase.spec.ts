import {
  MockUserRepository,
  UserTestFactory,
} from 'src/modules/identity/testing';
import { CreateUserUseCase } from './create-user.usecase';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { RepositoryError } from '../../../../../../../shared-kernel/domain/exceptions/repository.error';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    useCase = new CreateUserUseCase(mockUserRepository);

    mockUserRepository.mockSuccessfulSave();
  });

  afterEach(() => {
    mockUserRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if user is created successfully', async () => {
      const createUserDto = UserTestFactory.createCreateUserCommand();

      const result = await useCase.execute(createUserDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.firstName).toBe(createUserDto.firstName);
      expect(result.value.email).toBe(createUserDto.email);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(RepositoryError) if repository save fails', async () => {
      const createUserDto = UserTestFactory.createCreateUserCommand();
      const repoError = ErrorFactory.RepositoryError('Failed to save User');
      mockUserRepository.save.mockResolvedValue(repoError);

      const result = await useCase.execute(createUserDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save User',
        RepositoryError,
      );
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
