import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { AddressType } from 'src/shared-kernel/domain/value-objects/address-type';
import { UserRepository } from 'src/modules/identity/core/domain/repositories/user.repository';
import { IUser } from 'src/modules/identity/core/domain/interfaces/user.interface';
import { User } from 'src/modules/identity/core/domain/entities/user';

export interface CreateUserAddressInput {
  id: number | null;
  street: string;
  street2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  type?: AddressType;
  deliveryInstructions: string | null;
}

export interface CreateUserCommand {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

@Injectable()
export class CreateUserUseCase extends UseCase<
  CreateUserCommand,
  IUser,
  UseCaseError
> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(dto: CreateUserCommand): Promise<Result<IUser, UseCaseError>> {
    const user = User.create({
      id: null,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone ?? null,
      addresses: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saveResult = await this.userRepository.save(user);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<IUser>(user.toPrimitives());
  }
}
