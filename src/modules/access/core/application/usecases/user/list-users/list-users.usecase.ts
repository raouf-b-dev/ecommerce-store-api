import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import { IUser } from 'src/modules/access/core/domain/interfaces/user.interface';
import { UserRepository } from 'src/modules/access/core/domain/repositories/user.repository';

export interface ListUsersQuery {
  search?: string;
  email?: string;
  phone?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListUsersUseCase
  implements UseCase<ListUsersQuery, IUser[], UseCaseError>
{
  constructor(private userRepository: UserRepository) {}

  async execute(query: ListUsersQuery): Promise<Result<IUser[], UseCaseError>> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const usersResult = await this.userRepository.findAll(page, limit);

    if (usersResult.isFailure) return usersResult;

    const result: IUser[] = usersResult.value.map((user) =>
      user.toPrimitives(),
    );

    return Result.success(result);
  }
}
