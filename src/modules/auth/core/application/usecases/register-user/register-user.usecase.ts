import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/entities/user';
import { PasswordHasher } from '../../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { RegisterDto } from '../../../../primary-adapters/dto/register.dto';
import { CustomerGateway } from '../../ports/customer.gateway';
import { CUSTOMER_GATEWAY } from '../../../../auth.tokens';
import { SystemRoleCode } from '../../../domain/reference-data/system-roles';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { IUser } from '../../../domain/interfaces/user.interface';

@Injectable()
export class RegisterUserUseCase extends UseCase<
  RegisterDto,
  { user: IUser; customerId: number },
  UseCaseError
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly passwordHasher: PasswordHasher,
    @Inject(CUSTOMER_GATEWAY)
    private readonly customerGateway: CustomerGateway,
  ) {
    super();
  }

  async execute(
    dto: RegisterDto,
  ): Promise<Result<{ user: IUser; customerId: number }, UseCaseError>> {
    // 1. Check if user exists
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser.isSuccess && existingUser.value) {
      return ErrorFactory.UseCaseError('User with this email already exists');
    }

    // 2. Create Customer
    const customerResult = await this.customerGateway.createCustomer({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
    });

    if (isFailure(customerResult)) return customerResult;

    const customer = customerResult.value;

    // 3. Hash Password
    const passwordHash = await this.passwordHasher.hash(dto.password);

    // 4. Get Default Role
    const roleResult = await this.roleRepository.findByCode(
      SystemRoleCode.CUSTOMER,
    );
    if (isFailure(roleResult) || !roleResult.value) {
      return ErrorFactory.UseCaseError('Failed to find default customer role');
    }

    // 5. Create User
    const user = User.create(
      null,
      dto.email,
      passwordHash,
      false, // Self-registered user chose their own password
      roleResult.value.id,
      customer.id!,
    );

    const saveResult = await this.userRepository.save(user);
    if (isFailure(saveResult)) return saveResult;

    return Result.success({
      user: saveResult.value.toPrimitives(),
      customerId: customer.id!,
    });
  }
}
