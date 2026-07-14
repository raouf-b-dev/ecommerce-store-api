import { CreateUserUseCase, CreateUserCommand } from './create-user.usecase';
import { MockUserRepository } from '../../../../../testing/mocks/user-repository.mock';
import { MockRoleRepository } from '../../../../../testing/mocks/role-repository.mock';
import { RoleTestFactory } from '../../../../../testing/factories/role.factory';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import { User } from '../../../../domain/entities/user';
import { RepositoryError } from '../../../../../../../shared-kernel/domain/exceptions/repository.error';
import { DEFAULT_ROLE_CODE } from '../../../../domain/reference-data/system-roles';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: MockUserRepository;
  let mockRoleRepository: MockRoleRepository;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    mockRoleRepository = new MockRoleRepository();
    useCase = new CreateUserUseCase(mockUserRepository, mockRoleRepository);

    // Mock successful default role retrieval
    const defaultRole = RoleTestFactory.buildEntity({
      code: DEFAULT_ROLE_CODE,
    });
    mockRoleRepository.findByCode.mockResolvedValue(
      Result.success(defaultRole),
    );

    // Mock successful user save
    mockUserRepository.save.mockImplementation((user) => {
      const primitives = user.toPrimitives();
      if (!primitives.id) {
        primitives.id = 123;
      }
      return Promise.resolve(Result.success(User.fromProps(primitives)));
    });
  });

  afterEach(() => {
    mockUserRepository.reset();
    mockRoleRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if user is created successfully', async () => {
      const createUserDto: CreateUserCommand = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        mustChangePassword: false,
        passwordHash: 'hashedPassword',
      };

      const result = await useCase.execute(createUserDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.firstName).toBe(createUserDto.firstName);
      expect(result.value.email).toBe(createUserDto.email);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if default role cannot be resolved', async () => {
      mockRoleRepository.findByCode.mockResolvedValue(Result.success(null));

      const createUserDto: CreateUserCommand = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        mustChangePassword: false,
        passwordHash: 'hashedPassword',
      };

      const result = await useCase.execute(createUserDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find default role',
        UseCaseError,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure(RepositoryError) if repository save fails', async () => {
      const createUserDto: CreateUserCommand = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        mustChangePassword: false,
        passwordHash: 'hashedPassword',
      };
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
