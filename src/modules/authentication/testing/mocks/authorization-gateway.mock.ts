import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import { Result } from 'src/shared-kernel/domain/result';
import {
  AuthorizationGateway,
  RoleRecord,
} from '../../core/application/ports/authorization.gateway';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';

export class AuthorizationGatewayMock implements AuthorizationGateway {
  assignDefaultRole = jest.fn<
    Promise<Result<void, InfrastructureError>>,
    [number]
  >();

  findRoleByUserId = jest.fn<
    Promise<Result<RoleRecord | null, InfrastructureError>>,
    [number]
  >();

  mockSuccessfulAssignDefaultRole() {
    this.assignDefaultRole.mockResolvedValue(Result.success(undefined));
  }

  mockFailedAssignDefaultRole(message: string) {
    this.assignDefaultRole.mockResolvedValue(
      ErrorFactory.InfrastructureError(message),
    );
  }

  mockSuccessfulFindRoleByUserId(result: RoleRecord | null) {
    this.findRoleByUserId.mockResolvedValue(Result.success(result));
  }

  mockFailedFindRoleByUserId(message: string) {
    this.findRoleByUserId.mockResolvedValue(
      ErrorFactory.InfrastructureError(message),
    );
  }

  // Reset mock
  reset() {
    this.assignDefaultRole.mockClear();
    this.findRoleByUserId.mockClear();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.assignDefaultRole).not.toHaveBeenCalled();
    expect(this.findRoleByUserId).not.toHaveBeenCalled();
  }
}
