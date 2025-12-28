import { Injectable } from '@nestjs/common';
import { isFailure, Result } from '../../../../../core/domain/result';
import { RegisterUserUseCase } from '../../../application/usecases/register-user/register-user.usecase';
import { RegisterDto } from '../../dto/register.dto';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { IUser } from '../../../domain/interfaces/user.interface';

@Injectable()
export class RegisterUserController {
  constructor(private readonly registerUseCase: RegisterUserUseCase) {}

  async handle(
    dto: RegisterDto,
  ): Promise<Result<{ user: IUser; customerId: number }, ControllerError>> {
    try {
      const result = await this.registerUseCase.execute(dto);

      if (isFailure(result)) return result;

      return Result.success({
        user: result.value.user.toPrimitives(),
        customerId: result.value.customerId,
      });
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected controller error', error);
    }
  }
}
