import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PasswordHasher } from '../../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { ACCESS_GATEWAY } from '../../../../auth.tokens';
import { IdentityAccessGateway, UserRecord } from '../../ports/access.gateway';

export interface RegisterCommand {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

@Injectable()
export class RegisterUserUseCase extends UseCase<
  RegisterCommand,
  UserRecord,
  UseCaseError
> {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    @Inject(ACCESS_GATEWAY)
    private readonly userGateway: IdentityAccessGateway,
  ) {
    super();
  }

  async execute(
    command: RegisterCommand,
  ): Promise<Result<UserRecord, UseCaseError>> {
    // 1. Check if user exists
    const existingUser = await this.userGateway.checkEmailExists(command.email);
    if (existingUser.isSuccess && existingUser.value) {
      return ErrorFactory.UseCaseError(
        'User with this email already exists',
        null,
        HttpStatus.CONFLICT,
      );
    }

    // 3. Hash Password
    const passwordHash = await this.passwordHasher.hash(command.password);

    // 2. Create Customer
    const createUserResult = await this.userGateway.createUser({
      firstName: command.firstName,
      lastName: command.lastName,
      email: command.email,
      phone: command.phone,
      mustChangePassword: false,
      passwordHash: passwordHash,
    });

    if (isFailure(createUserResult)) return createUserResult;

    const registredUser = createUserResult.value;

    return Result.success(registredUser);
  }
}
