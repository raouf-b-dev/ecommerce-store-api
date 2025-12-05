import { Injectable } from '@nestjs/common';
import { isFailure, Result } from '../../../../../core/domain/result';
import { LoginUserUseCase } from '../../../application/usecases/login-user/login-user.usecase';
import { LoginDto } from '../../dto/login.dto';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';

@Injectable()
export class LoginUserController {
  constructor(private readonly loginUseCase: LoginUserUseCase) {}

  async handle(
    dto: LoginDto,
  ): Promise<Result<{ accessToken: string }, ControllerError>> {
    try {
      const result = await this.loginUseCase.execute(dto);

      if (isFailure(result)) return result;

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected controller error', error);
    }
  }
}
