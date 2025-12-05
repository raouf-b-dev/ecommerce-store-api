import { JwtService } from '@nestjs/jwt';
import { MockUserRepository } from '../../../testing/mocks/user-repository.mock';
import { LoginUserUseCase } from './login-user.usecase';
import { Result } from '../../../../../core/domain/result';
import { User } from '../../../domain/entities/user';
import { UserTestFactory } from '../../../testing/factories/user.factory';
import { ResultAssertionHelper } from '../../../../../testing';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { MockBcryptService } from '../../../testing/mocks/bcrypt-service.mock';

describe('LoginUserUseCase', () => {
  let usecase: LoginUserUseCase;
  let userRepository: MockUserRepository;
  let bcryptService: MockBcryptService;
  let jwtService: JwtService;

  let mockDomainUser: User;
  beforeEach(() => {
    userRepository = new MockUserRepository();
    bcryptService = new MockBcryptService();
    jwtService = new JwtService({ secret: 'test-secret' });
    usecase = new LoginUserUseCase(userRepository, bcryptService, jwtService);
    mockDomainUser = User.fromPrimitives(
      UserTestFactory.createMockCustomerUser(),
    );
  });
  afterEach(() => {
    userRepository.reset();
  });

  it('should login a user successfully', async () => {
    userRepository.findByEmail.mockResolvedValue(
      Result.success(mockDomainUser),
    );
    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.accessToken).toBeDefined();
  });

  it('should return failure if user is not found', async () => {
    userRepository.findByEmail.mockResolvedValue(Result.success(null));
    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
    });
    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid credentials',
      UseCaseError,
    );
  });

  it('should return failure if password is incorrect', async () => {
    userRepository.findByEmail.mockResolvedValue(
      Result.success(mockDomainUser),
    );
    bcryptService.compare.mockResolvedValue(false);
    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
    });
    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid credentials',
      UseCaseError,
    );
  });

  it('should return failure if unexpected error occurs', async () => {
    const error = new Error('Unexpected error');
    userRepository.findByEmail.mockRejectedValue(error);
    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
    });
    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected error',
      UseCaseError,
    );
  });
});
