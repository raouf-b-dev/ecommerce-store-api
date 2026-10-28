import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { StatusCode } from '../../../../../shared-kernel/domain/exceptions/status-code';

/** Permission that lets a user change its own password and revoke all its sessions. */
export const CHANGE_OWN_CREDENTIALS_PERMISSION = 'change_own_credentials';

/**
 * A role without change_own_credentials (for example the read-only admin used
 * as the shared hosted demo login, whose password is published) cannot change
 * its credentials; otherwise one visitor could lock every other visitor out.
 */
export function ensureCredentialsChangeable(
  permissions: Iterable<string>,
): Result<void, DomainError> {
  if (!new Set(permissions).has(CHANGE_OWN_CREDENTIALS_PERMISSION)) {
    return ErrorFactory.DomainError(
      'Changing credentials requires the change_own_credentials permission',
      null,
      StatusCode.FORBIDDEN,
    );
  }
  return Result.success(undefined);
}
