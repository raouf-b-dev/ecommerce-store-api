import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';

/**
 * A published demo password may only be (re)applied to an existing account
 * that already holds the role the demo account is meant to have. Otherwise a
 * demo email pointing at a privileged account would hand that account to
 * anyone who knows the public password.
 */
export function ensureDemoAccountRoleMatches(
  email: string,
  expectedRoleCode: string,
  currentRoleCode: string | null,
): Result<void, DomainError> {
  if (currentRoleCode !== expectedRoleCode) {
    return ErrorFactory.DomainError(
      `Refusing to reseed ${email}: existing account has role ${currentRoleCode ?? 'none'}, expected ${expectedRoleCode}`,
    );
  }
  return Result.success(undefined);
}
