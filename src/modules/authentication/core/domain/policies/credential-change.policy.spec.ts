import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { SystemRoleCode } from '../../../../../shared-kernel/domain/value-objects/system-roles';
import { ensureCredentialsChangeable } from './credential-change.policy';

describe('ensureCredentialsChangeable', () => {
  it.each([
    SystemRoleCode.SUPER_ADMIN,
    SystemRoleCode.ADMIN,
    SystemRoleCode.CUSTOMER,
    'CUSTOM_ROLE',
  ])('accepts the %s role', (roleCode) => {
    ResultAssertionHelper.assertResultSuccess(
      ensureCredentialsChangeable(roleCode),
    );
  });

  it('refuses the read-only admin role with a forbidden error', () => {
    const result = ensureCredentialsChangeable(SystemRoleCode.ADMIN_READONLY);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Read-only admin accounts cannot change their credentials',
    );
    expect(result.error.statusCode).toBe(403);
  });
});
