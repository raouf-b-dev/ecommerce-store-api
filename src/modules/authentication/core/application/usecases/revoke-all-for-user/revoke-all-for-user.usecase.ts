import { Injectable } from '@nestjs/common';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { SessionTokenRepository } from '../../../domain/repositories/session-token.repository';

@Injectable()
export class RevokeAllForUserUsecase implements UseCase<
  number,
  void,
  UseCaseError
> {
  constructor(
    private readonly sessionTokenRepository: SessionTokenRepository,
  ) {}
  async execute(userId: number): Promise<Result<void, UseCaseError>> {
    const revokeResult =
      await this.sessionTokenRepository.revokeAllForUser(userId);
    return revokeResult;
  }
}
