import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { Result } from 'src/shared-kernel/domain/result';
import { RevokeAllForUserUsecase } from '../../core/application/usecases/revoke-all-for-user/revoke-all-for-user.usecase';

export class MockRevokeAllForUserUsecase implements Pick<
  RevokeAllForUserUsecase,
  'execute'
> {
  execute = jest.fn<Promise<Result<void, UseCaseError>>, [number]>();

  mockSuccessfulExecute(): void {
    this.execute.mockResolvedValue(Result.success(undefined));
  }

  reset(): void {
    jest.clearAllMocks();
    this.mockSuccessfulExecute();
  }
}
