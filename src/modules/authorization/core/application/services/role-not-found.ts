import { ErrorCode } from '../../../../../shared-kernel/domain/exceptions/error-code';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorKind } from '../../../../../shared-kernel/domain/exceptions/error-kind';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../shared-kernel/domain/result';

export function roleNotFoundError(
  message = 'Role not found',
): Result<never, UseCaseError> {
  return ErrorFactory.UseCaseError(message, {
    kind: ErrorKind.NOT_FOUND,
    code: ErrorCode.ROLE_NOT_FOUND,
  });
}

export function userRoleAssignmentNotFoundError(
  message = 'User role assignment not found',
): Result<never, UseCaseError> {
  return ErrorFactory.UseCaseError(message, {
    kind: ErrorKind.NOT_FOUND,
    code: ErrorCode.USER_ROLE_ASSIGNMENT_NOT_FOUND,
  });
}
