import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/application/use-cases/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/errors/error.factory';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/entities/user';
import { BcryptService } from '../../../../secondary-adapters/services/bcrypt.service';
import { RegisterDto } from '../../../../primary-adapters/dto/register.dto';
import { CreateCustomerUseCase } from '../../../../../customers/core/application/usecases/create-customer/create-customer.usecase';
import { UserRoleType } from '../../../domain/value-objects/user-role';
import { IUser } from '../../../domain/interfaces/user.interface';

@Injectable()
export class RegisterUserUseCase extends UseCase<
  RegisterDto,
  { user: IUser; customerId: number },
  UseCaseError
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly bcryptService: BcryptService,
    private readonly createCustomerUseCase: CreateCustomerUseCase,
  ) {
    super();
  }

  async execute(
    dto: RegisterDto,
  ): Promise<Result<{ user: IUser; customerId: number }, UseCaseError>> {
    try {
      // 1. Check if user exists
      const existingUser = await this.userRepository.findByEmail(dto.email);
      if (existingUser.isSuccess && existingUser.value) {
        return ErrorFactory.UseCaseError('User with this email already exists');
      }

      // 2. Create Customer
      const customerResult = await this.createCustomerUseCase.execute({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
      });

      if (isFailure(customerResult)) return customerResult;

      const customer = customerResult.value;

      // 3. Hash Password
      const passwordHash = await this.bcryptService.hash(dto.password);

      // 4. Create User
      const user = User.create(
        null,
        dto.email,
        passwordHash,
        UserRoleType.CUSTOMER,
        customer.id!,
      );

      const saveResult = await this.userRepository.save(user);
      if (isFailure(saveResult)) return saveResult;

      return Result.success({
        user: saveResult.value.toPrimitives(),
        customerId: customer.id!,
      });
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error during registration',
        error,
      );
    }
  }
}
