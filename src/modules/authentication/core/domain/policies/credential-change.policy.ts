import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { StatusCode } from '../../../../../shared-kernel/domain/exceptions/status-code';
import { SystemRoleCode } from '../../../../../shared-kernel/domain/value-objects/system-roles';

/**
 * The read-only admin role is the shared hosted demo login, so its password is
 * published. Letting it change its own credentials would let one visitor lock
 * every other visitor out of the demo.
 */
export function ensureCredentialsChangeable(
  roleCode: string,
): Result<void, DomainError> {
  if (roleCode === String(SystemRoleCode.ADMIN_READONLY)) {
    return ErrorFactory.DomainError(
      'Read-only admin accounts cannot change their credentials',
      null,
      StatusCode.FORBIDDEN,
    );
  }
  return Result.success(undefined);
}
