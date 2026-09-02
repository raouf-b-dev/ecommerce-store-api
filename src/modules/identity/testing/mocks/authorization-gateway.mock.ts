import { HttpStatus } from '@nestjs/common';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import { Result } from 'src/shared-kernel/domain/result';
import { AuthorizationGateway } from '../../core/application/ports/authorization.gateway';

export class AuthorizationGatewayMock implements AuthorizationGateway {
  assignRole = jest.fn<
    Promise<Result<void, InfrastructureError>>,
    [number, string]
  >();

  mockSuccessfulAssignRole(): void {
    this.assignRole.mockResolvedValue(Result.success(undefined));
  }

  mockFailedAssignRole(message: string, status?: HttpStatus): void {
    this.assignRole.mockResolvedValue(
      ErrorFactory.InfrastructureError(message, undefined, status),
    );
  }

  reset(): void {
    this.assignRole.mockClear();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.assignRole).not.toHaveBeenCalled();
  }
}
