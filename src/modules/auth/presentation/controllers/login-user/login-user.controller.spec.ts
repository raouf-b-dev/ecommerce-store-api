import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { LoginUserUseCase } from '../../../application/usecases/login-user/login-user.usecase';
import { LoginDtoTestFactory } from '../../../testing/factories/login-dto.factory';
import { LoginUserController } from './login-user.controller';

describe('LoginUserController', () => {
  let controller: LoginUserController;
  let mockLoginUserUseCase: jest.Mocked<LoginUserUseCase>;

  beforeEach(() => {
    mockLoginUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<LoginUserUseCase>;

    controller = new LoginUserController(mockLoginUserUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return a success result with an access token', async () => {
      const dto = LoginDtoTestFactory.createLoginDto();
      const result = Result.success({ accessToken: 'access_token' });
      mockLoginUserUseCase.execute.mockResolvedValue(result);

      const response = await controller.handle(dto);

      ResultAssertionHelper.assertResultSuccess(response);
    });
  });

  it('should return a failure result with an error', async () => {
    const dto = LoginDtoTestFactory.createLoginDto();
    const result = Result.failure(new UseCaseError('error'));
    mockLoginUserUseCase.execute.mockResolvedValue(result);

    const response = await controller.handle(dto);

    ResultAssertionHelper.assertResultFailure(response, 'error', UseCaseError);
  });

  it('should catch unexpected exceptions and return a ControllerError', async () => {
    const dto = LoginDtoTestFactory.createLoginDto();
    const unexpectedError = new Error('Database connection failed');
    mockLoginUserUseCase.execute.mockRejectedValue(unexpectedError);

    const response = await controller.handle(dto);

    ResultAssertionHelper.assertResultFailure(
      response,
      'Unexpected controller error',
      ControllerError,
      unexpectedError,
    );
  });
});
