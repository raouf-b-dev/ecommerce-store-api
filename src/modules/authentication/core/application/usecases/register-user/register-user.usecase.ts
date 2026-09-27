import { HttpStatus, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PasswordHasher } from '../../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { IdentityGateway, UserRecord } from '../../ports/identity.gateway';
import { CredentialRepository } from '../../../domain/repositories/credential.repository';
import { AuthorizationGateway } from '../../ports/authorization.gateway';
import { Credential } from '../../../domain/entities/credential';
import { RegisterCommand } from '../../commands/register.command';

@Injectable()
export class RegisterUserUseCase extends UseCase<
  RegisterCommand,
  UserRecord,
  UseCaseError
> {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    private readonly identityGateway: IdentityGateway,
    private readonly authorizationGateway: AuthorizationGateway,
    private readonly credentialRepository: CredentialRepository,
  ) {
    super();
  }

  async execute(
    command: RegisterCommand,
  ): Promise<Result<UserRecord, UseCaseError>> {
    const existsResult = await this.identityGateway.checkEmailExists(
      command.email,
    );
    if (isFailure(existsResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to verify email availability',
        existsResult.error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (existsResult.value) {
      return ErrorFactory.UseCaseError(
        'User with this email already exists',
        null,
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await this.passwordHasher.hash(command.password);

    // Step 1: Create identity
    const createUserResult = await this.identityGateway.createUser({
      firstName: command.firstName,
      lastName: command.lastName,
      email: command.email,
      phone: command.phone,
    });
    if (isFailure(createUserResult)) return createUserResult;

    const registeredUser = createUserResult.value;

    // Step 2: Create credential
    const credentialResult = await this.credentialRepository.save(
      Credential.create({
        userId: registeredUser.id,
        passwordHash,
        mustChangePassword: false,
      }),
    );
    if (isFailure(credentialResult)) {
      await this.identityGateway.deleteUser(registeredUser.id); // compensate step 1
      return ErrorFactory.UseCaseError(
        'Failed to complete registration',
        credentialResult.error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Step 3: Assign default role
    const roleResult = await this.authorizationGateway.assignDefaultRole(
      registeredUser.id,
    );
    if (isFailure(roleResult)) {
      await this.credentialRepository.deleteByUserId(registeredUser.id); // compensate step 2
      await this.identityGateway.deleteUser(registeredUser.id); // compensate step 1
      return ErrorFactory.UseCaseError(
        'Failed to complete registration',
        roleResult.error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return Result.success(registeredUser);
  }
}
