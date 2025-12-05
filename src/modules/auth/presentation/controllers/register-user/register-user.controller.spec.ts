import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { RegisterUserUseCase } from '../../../application/usecases/register-user/register-user.usecase';
import { User } from '../../../domain/entities/user';
import { RegisterDtoTestFactory } from '../../../testing/factories/register-dto.factory';
import { UserTestFactory } from '../../../testing/factories/user.factory';
import { RegisterUserController } from './register-user.controller';

describe('RegisterUserController', () => {
  let controller: RegisterUserController;
  let useCase: jest.Mocked<RegisterUserUseCase>;

  beforeEach(() => {
    useCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RegisterUserUseCase>;

    controller = new RegisterUserController(useCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with user when use case succeeds', async () => {
      // Arrange
      const dto = RegisterDtoTestFactory.createRegisterDto();
      const user = UserTestFactory.createMockCustomerUser();

      const userDomain = User.fromPrimitives(user);
      useCase.execute.mockResolvedValue(
        Result.success({ user: userDomain, customerId: user.customerId! }),
      );

      // Act
      const result = await controller.handle(dto);

      // Assert
      expect(useCase.execute).toHaveBeenCalledWith(dto);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({ user, customerId: user.customerId! });
    });

    it('should return the specific failure result when use case fails', async () => {
      // Arrange
      const dto = RegisterDtoTestFactory.createRegisterDto();
      const expectedError = new UseCaseError('User already exists');

      useCase.execute.mockResolvedValue(Result.failure(expectedError));

      // Act
      const result = await controller.handle(dto);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'User already exists',
        UseCaseError,
      );
    });

    it('should catch unexpected exceptions and return a ControllerError', async () => {
      // Arrange
      const dto = RegisterDtoTestFactory.createRegisterDto();
      const unexpectedError = new Error('Database connection failed');

      useCase.execute.mockRejectedValue(unexpectedError);

      // Act
      const result = await controller.handle(dto);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected controller error',
        ControllerError,
        unexpectedError,
      );
    });
  });
});
