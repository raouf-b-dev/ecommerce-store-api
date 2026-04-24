import { JwtSignerService } from '../../../../../../infrastructure/jwt/jwt-signer.service';
import { MockJwtSignerService } from '../../../../../../testing/mocks/jwt-signer.service.mock';
import { MockUserRepository } from '../../../../testing/mocks/user-repository.mock';
import { MockSessionTokenRepository } from '../../../../testing/mocks/session-token-repository.mock';
import { MockBcryptService } from '../../../../testing/mocks/bcrypt-service.mock';
import { LoginUserUseCase } from './login-user.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { User } from '../../../domain/entities/user';
import { UserTestFactory } from '../../../../testing/factories/user.factory';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';

describe('LoginUserUseCase', () => {
  let usecase: LoginUserUseCase;
  let userRepository: MockUserRepository;
  let sessionTokenRepository: MockSessionTokenRepository;
  let bcryptService: MockBcryptService;
  let jwtSignerService: MockJwtSignerService;

  let mockDomainUser: User;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    sessionTokenRepository = new MockSessionTokenRepository();
    bcryptService = new MockBcryptService();
    jwtSignerService = new MockJwtSignerService();

    usecase = new LoginUserUseCase(
      userRepository,
      sessionTokenRepository,
      bcryptService,
      jwtSignerService as unknown as JwtSignerService,
    );
    mockDomainUser = User.fromPrimitives(
      UserTestFactory.createMockCustomerUser(),
    );
  });

  afterEach(() => {
    userRepository.reset();
    sessionTokenRepository.reset();
  });

  it('should login a user successfully', async () => {
    userRepository.findByEmail.mockResolvedValue(
      Result.success(mockDomainUser),
    );
    sessionTokenRepository.save.mockResolvedValue(Result.success({} as any));

    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'password',
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.accessToken).toContain('header');
    expect(result.value.refreshToken).toContain('header');
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
});
