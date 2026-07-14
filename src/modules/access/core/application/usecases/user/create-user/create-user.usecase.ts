// src/modules/users/application/usecases/create-users/create-user.usecase.ts
import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { AddressType } from 'src/shared-kernel/domain/value-objects/address-type';
import { UserRepository } from 'src/modules/access/core/domain/repositories/user.repository';
import { IUser } from 'src/modules/access/core/domain/interfaces/user.interface';
import { User, UserProps } from 'src/modules/access/core/domain/entities/user';
import { DEFAULT_ROLE_CODE } from 'src/modules/access/core/domain/reference-data/system-roles';
import { RoleRepository } from 'src/modules/access/core/domain/repositories/role.repository';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';

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
  mustChangePassword: boolean;
  passwordHash: string;
  phone?: string;
}

@Injectable()
export class CreateUserUseCase extends UseCase<
  CreateUserCommand,
  IUser,
  UseCaseError
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {
    super();
  }

  async execute(dto: CreateUserCommand): Promise<Result<IUser, UseCaseError>> {
    const defaultRoleResult =
      await this.roleRepository.findByCode(DEFAULT_ROLE_CODE);
    if (isFailure(defaultRoleResult) || !defaultRoleResult.value) {
      return ErrorFactory.UseCaseError('Failed to find default role');
    }
    const defaultRole = defaultRoleResult.value;

    const user = User.create({
      id: null,
      passwordHash: dto.passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone ?? null,
      addresses: [],
      roleId: defaultRole.id,
      isActive: true,
      mustChangePassword: dto.mustChangePassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saveResult = await this.userRepository.save(user);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<IUser>(saveResult.value.toPrimitives());
  }
}
